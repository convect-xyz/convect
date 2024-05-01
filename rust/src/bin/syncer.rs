use aws_config::BehaviorVersion;
use aws_sdk_lambda::{
    error::SdkError,
    operation::invoke::{InvokeError, InvokeOutput},
    types::InvocationType,
};
use aws_sdk_s3::primitives::{Blob, ByteStream};
use aws_smithy_types::body::SdkBody;
use futures::{future::join_all, TryFutureExt};
use ingest::{
    api::{self, Batch, IngestTransaction},
    log_fetcher::invocation::InvocationResponse,
    syncer::{self, Pipeline},
};
use serde::Serialize;
use std::error::Error;

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

    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let s3_client = aws_sdk_s3::Client::new(&config);
    let sqs_client = aws_sdk_sqs::Client::new(&config);

    let result = run(&s3_client, &sqs_client).await;

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

async fn run(
    s3_client: &aws_sdk_s3::Client,
    sqs_client: &aws_sdk_sqs::Client,
) -> Result<(), Box<dyn Error>> {
    let syncer_config = syncer::load_config_from_env();
    let configs = get_block_configs(syncer_config.start_block, syncer_config.end_block);

    let use_batch = false;

    if use_batch {
        batch(s3_client, sqs_client, configs, syncer_config).await;
    } else {
        for chunk in configs.chunks(100) {
            let invocations = invoke_lambdas(chunk).await;
            let s3_results = get_s3_results(&invocations).await;

            api::upload_to_sqs(
                sqs_client,
                syncer_config.tx_queue_url.clone(),
                api::SQSPayload::Transactions(
                    s3_results.into_iter().map(|r| r.0).flatten().collect(),
                ),
            )
            .await;
        }
    }

    Ok(())
}

async fn batch(
    s3_client: &aws_sdk_s3::Client,
    sqs_client: &aws_sdk_sqs::Client,
    configs: Vec<BlockConfig>,
    syncer_config: syncer::Config,
) {
    let mut batch = Vec::new();
    let mut batch_size = 0;
    for chunk in configs.chunks(100) {
        let invocations = invoke_lambdas(chunk).await;
        let s3_results = get_s3_results(&invocations).await;

        let mut i = 0;
        while i < s3_results.len() {
            let s3_result = &s3_results[i];

            // If this result makes it go over limit, upload it.
            if batch_size + s3_result.1 > 1024 * 1024 * 1 {
                let id = uuid::Uuid::new_v4();
                let key = format!("syncs/{}", id);

                let response = s3_client
                    .put_object()
                    .bucket("ingest-fetch-logs")
                    .key(key.to_string())
                    .body(ByteStream::new(SdkBody::from(
                        serde_json::to_string(&batch).unwrap(),
                    )))
                    .send()
                    .await;

                match response {
                    Ok(_) => {}
                    Err(e) => panic!("Error uploading response: {:?}", e),
                }

                api::upload_to_sqs(
                    &sqs_client,
                    syncer_config.tx_queue_url.clone(),
                    api::SQSPayload::Batch(Batch {
                        bucket: "ingest-fetch-logs".to_string(),
                        prefix: key.to_string(),
                    }),
                )
                .await;

                // Reset
                batch_size = 0;
                batch = Vec::new();
            }

            batch_size += s3_result.1;
            batch.extend(s3_result.0.clone());
            i += 1;
        }
    }
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

#[derive(Debug)]
pub struct S3Result(Vec<IngestTransaction>, usize);

async fn get_s3_results(
    invocations: &Vec<Result<InvokeOutput, SdkError<InvokeError>>>,
) -> Vec<S3Result> {
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
                .bucket(&response.s3_bucket.unwrap())
                .key(&response.s3_prefix.unwrap())
                .send()
                .and_then(move |r| async move {
                    let data = r.body.collect().await.unwrap();
                    let content =
                        String::from_utf8(data.into_bytes().to_vec()).expect("Invalid UTF-8");

                    let data: Vec<IngestTransaction> = serde_json::from_str(&content).unwrap();
                    Ok(S3Result(data, response.size))
                }),
        );
    }

    join_all(s3_result_futures)
        .await
        .into_iter()
        .map(|f| f.unwrap())
        // .flatten()
        .collect::<Vec<S3Result>>()
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
