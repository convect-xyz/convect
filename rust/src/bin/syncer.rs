use aws_config::BehaviorVersion;
use aws_sdk_lambda::{
    error::SdkError,
    operation::invoke::{InvokeError, InvokeOutput},
    types::InvocationType,
};
use aws_sdk_s3::primitives::Blob;
use futures::{future::join_all, TryFutureExt};
use ingest::{
    api::{
        enqueuer::TransactionEnqueuerImpl,
        fetcher::{TransactionFetcherImpl, Web3ClientImpl},
        Api,
    },
    log_fetcher::invocation::{InvocationRequest, InvocationResponse},
    types::{self, pipeline::Pipeline, transactions::IngestTransaction},
};
use serde::Serialize;
use std::error::Error;

type ApiInstance =
    Api<TransactionFetcherImpl<Web3ClientImpl>, TransactionEnqueuerImpl<aws_sdk_s3::Client>>;

#[derive(Serialize, Debug)]
struct BlockConfig {
    id: String,
    start_block: u64,
    end_block: u64,
}

const BATCH_SIZE: u64 = 1500;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let syncer_config = load_config_from_env();
    let mut pipeline = Pipeline::load(syncer_config.handler_id.clone());
    let config = aws_config::load_from_env().await;
    let api: ApiInstance = Api::new(&config);

    let result = run(&api, &mut pipeline).await;

    let update_result = match result {
        Ok(_) => pipeline
            .update()
            .set_state(types::pipeline::SyncState::IDLE)
            .set_last_block(syncer_config.end_block)
            .send(),
        Err(_) => pipeline
            .update()
            .set_state(types::pipeline::SyncState::FAILED)
            .send(),
    };

    match update_result {
        Ok(_) => (),
        Err(err) => panic!("Failed to update pipeline configs: {:?}", err),
    }

    Ok(())
}

async fn run(api: &ApiInstance, pipeline: &mut Pipeline) -> Result<(), Box<dyn Error>> {
    let syncer_config = load_config_from_env();
    let configs = get_block_configs(
        syncer_config.start_block,
        syncer_config.end_block,
        BATCH_SIZE,
    );

    let mut delete_handles = Vec::new();

    for chunk in configs.chunks(100) {
        let invocations = invoke_lambdas(chunk).await;
        let s3_results: Vec<IngestTransaction> = get_s3_results(&invocations)
            .await
            .into_iter()
            .map(|r| r.0)
            .flatten()
            .collect();

        let _ = api
            .enqueue_transactions()
            .set_pipeline(pipeline)
            .set_queue_url(syncer_config.tx_queue_url.clone())
            .set_transactions(&s3_results)
            .send()
            .await;

        delete_handles.push(tokio::spawn(async move {
            delete_s3_results(&invocations).await;
        }));
    }

    join_all(delete_handles).await;

    Ok(())
}

async fn invoke_lambdas(
    configs: &[BlockConfig],
) -> Vec<Result<InvokeOutput, SdkError<InvokeError>>> {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let lambda_client = aws_sdk_lambda::Client::new(&config);
    let syncer_config = load_config_from_env();

    let mut lambda_invocation_futures = Vec::new();

    for config in configs {
        lambda_invocation_futures.push(
            lambda_client
                .invoke()
                .invocation_type(InvocationType::RequestResponse)
                .function_name(&syncer_config.function_name)
                .payload(Blob::new(
                    serde_json::to_vec(&InvocationRequest {
                        id: config.id.clone(),
                        start_block: config.start_block,
                        end_block: config.end_block,
                    })
                    .unwrap(),
                ))
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
        .collect::<Vec<S3Result>>()
}

async fn delete_s3_results(invocations: &Vec<Result<InvokeOutput, SdkError<InvokeError>>>) {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let s3_client = aws_sdk_s3::Client::new(&config);

    let mut s3_deletion_futures = Vec::new();
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

        s3_deletion_futures.push(
            s3_client
                .delete_object()
                .bucket(&response.s3_bucket.unwrap())
                .key(&response.s3_prefix.unwrap())
                .send(),
        );
    }

    join_all(s3_deletion_futures).await;
}

fn get_block_configs(mut start_block: u64, end_block: u64, batch_size: u64) -> Vec<BlockConfig> {
    let mut result: Vec<BlockConfig> = Vec::new();

    while start_block + batch_size <= end_block {
        let id = uuid::Uuid::new_v4().to_string();
        result.push(BlockConfig {
            id,
            start_block,
            end_block: start_block + batch_size,
        });
        start_block += batch_size + 1;
    }

    if (end_block as i64 - start_block as i64) >= 0 {
        let id = uuid::Uuid::new_v4().to_string();

        result.push(BlockConfig {
            id,
            start_block,
            end_block,
        });
    }

    return result;
}

use std::env;

pub struct Config {
    pub handler_id: String,
    pub project_id: String,
    pub start_block: u64,
    pub end_block: u64,
    pub function_name: String,
    pub tx_queue_url: String,
}

pub fn load_config_from_env() -> Config {
    return Config {
        handler_id: env::var("HANDLER_ID").expect("Handler ID not set"),
        project_id: env::var("PROJECT_ID").expect("Project ID not set"),
        start_block: env::var("START_BLOCK")
            .expect("START_BLOCK is not present")
            .parse()
            .expect("START_BLOCK is not a u64"),
        end_block: env::var("END_BLOCK")
            .expect("END_BLOCK is not present")
            .parse()
            .expect("END_BLOCK is not a u64"),
        function_name: env::var("LOG_FETCHER_LAMBDA_ARN")
            .expect("LOG_FETCHER_LAMBDA_ARN is not present"),
        tx_queue_url: env::var("TRANSACTION_QUEUE_URL")
            .expect("TRANSACTION_QUEUE_URL is not present"),
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_block_configs() {
        let actual_block_configs = get_block_configs(0u64, 200u64, 49u64);

        assert_eq!(
            actual_block_configs
                .into_iter()
                .map(|c| (c.start_block, c.end_block))
                .collect::<Vec<(u64, u64)>>(),
            vec![(0, 49), (50, 99), (100, 149), (150, 199), (200, 200)]
        );
    }
}
