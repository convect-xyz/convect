use aws_config::BehaviorVersion;
use aws_sdk_lambda::{
    error::SdkError,
    operation::invoke::{InvokeError, InvokeOutput},
    types::InvocationType,
};
use aws_sdk_s3::primitives::Blob;
use futures::{future::join_all, TryFutureExt};
use ingest::{
    api::{self, IngestTransaction},
    log_fetcher::invocation::InvocationResponse,
    syncer::{self, Pipeline},
};
use serde::Serialize;
use std::{error::Error, time::Duration};

#[derive(Serialize, Debug)]
struct BlockConfig {
    id: u64,
    start_block: u64,
    end_block: u64,
    previous_id: Option<u64>,
}

const BATCH_SIZE: u64 = 1999;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let syncer_config = syncer::load_config_from_env();
    let pipeline = Pipeline::load(syncer_config.pipeline_id.clone()).await;

    let result = run().await;

    let update_result = match result {
        Ok(_) => pipeline
            .update()
            .set_state(syncer::SyncState::IDLE)
            .set_last_block(syncer_config.end_block)
            .send(),
        Err(_) => pipeline
            .update()
            .set_state(syncer::SyncState::FAILED)
            .send(),
    }
    .await;

    match update_result {
        Ok(_) => (),
        Err(err) => panic!("Failed to update pipeline configs: {:?}", err),
    }

    Ok(())
}

async fn run() -> Result<(), Box<dyn Error>> {
    let syncer_config = syncer::load_config_from_env();

    let configs = get_block_configs(syncer_config.start_block, syncer_config.end_block);

    for batch in configs.chunks(100) {
        let invocations = invoke_lambdas(batch).await;
        let s3_results = get_s3_results(&invocations).await;
        api::upload_to_sqs(&s3_results).await;
        tokio::time::sleep(Duration::from_secs(1)).await;
    }

    Ok(())
}

async fn invoke_lambdas(
    configs: &[BlockConfig],
) -> Vec<Result<InvokeOutput, SdkError<InvokeError>>> {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let lambda_client = aws_sdk_lambda::Client::new(&config);
    let syncer_config = syncer::load_config_from_env();

    let mut lambda_invocation_futures = Vec::new();

    for config in configs {
        lambda_invocation_futures.push(
            lambda_client
                .invoke()
                .invocation_type(InvocationType::RequestResponse)
                .function_name(&syncer_config.function_name)
                .payload(Blob::new(serde_json::to_vec(config).unwrap()))
                .send(),
        );
    }

    return join_all(lambda_invocation_futures).await;
}

async fn get_s3_results(
    invocations: &Vec<Result<InvokeOutput, SdkError<InvokeError>>>,
) -> Vec<IngestTransaction> {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let s3_client = aws_sdk_s3::Client::new(&config);

    let mut s3_result_futures = Vec::new();
    for invocation in invocations {
        let output = match invocation {
            Ok(v) => v.to_owned(),
            Err(e) => panic!("Invocation Error: {e}"),
        };

        let payload = match output.payload {
            Some(v) => v.into_inner(),
            None => panic!("Blob is empty"),
        };

        let response: InvocationResponse = serde_json::from_slice(&payload).unwrap();
        if response.s3_bucket.is_none() || response.s3_prefix.is_none() {
            continue;
        }

        s3_result_futures.push(
            s3_client
                .get_object()
                .bucket(response.s3_bucket.unwrap())
                .key(response.s3_prefix.unwrap())
                .send()
                .and_then(|r| async move {
                    let data = r.body.collect().await.unwrap();
                    let content =
                        String::from_utf8(data.into_bytes().to_vec()).expect("Invalid UTF-8");

                    let data: Vec<IngestTransaction> = serde_json::from_str(&content).unwrap();
                    Ok(data)
                }),
        );
    }

    join_all(s3_result_futures)
        .await
        .into_iter()
        .map(|f| f.unwrap())
        .flatten()
        .collect::<Vec<IngestTransaction>>()
}

fn get_block_configs(mut start_block: u64, end_block: u64) -> Vec<BlockConfig> {
    let mut result: Vec<BlockConfig> = Vec::new();
    let mut previous_id: Option<u64> = None;
    while start_block + BATCH_SIZE < end_block {
        let id = previous_id.map(|p| p + 1).or(Some(1)).unwrap();
        result.push(BlockConfig {
            id,
            start_block,
            end_block: start_block + BATCH_SIZE,
            previous_id,
        });
        previous_id = Some(id);
        start_block += BATCH_SIZE + 1;
    }

    if end_block - start_block > 0 {
        let id = previous_id.map(|p| p + 1).or(Some(1)).unwrap();

        result.push(BlockConfig {
            id,
            start_block,
            end_block,
            previous_id,
        });
    }

    return result;
}
