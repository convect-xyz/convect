use aws_config::BehaviorVersion;
use aws_sdk_s3::error::BoxError;
use futures::{future::join_all, TryFutureExt};
use serde::Serialize;
use shared::{
    api::{
        enqueuer::TransactionEnqueuerImpl,
        fetcher::{TransactionFetcherImpl, Web3ClientImpl},
        Api,
    },
    log_fetcher_sdk::{self, InvocationRequest, InvocationResponse, LogFetcherSdk},
    types::{self, syncing::State, transactions::IngestTransaction},
};
use std::env;
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
    let mut pipeline = State::load(
        syncer_config.handler_id.clone(),
        syncer_config.handler_version.clone(),
    );
    let config = aws_config::load_from_env().await;
    let api: ApiInstance = Api::new(&config);

    let result = run(&api, &mut pipeline).await;

    let update_result = match result {
        Ok(_) => pipeline
            .update()
            .set_state(types::syncing::SyncState::IDLE)
            .set_last_block(syncer_config.end_block)
            .send(),
        Err(_) => pipeline
            .update()
            .set_state(types::syncing::SyncState::FAILED)
            .send(),
    };

    if let Err(err) = update_result {
        panic!("Failed to update pipeline configs: {:?}", err)
    }

    Ok(())
}

async fn run(api: &ApiInstance, pipeline: &mut State) -> Result<(), Box<dyn Error>> {
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
            .flatten()
            .collect();

        api.enqueue_transactions()
            .set_pipeline(pipeline)
            .set_queue_url(syncer_config.tx_queue_url.clone())
            .set_transactions(&s3_results)
            .send()
            .await?;

        pipeline
            .update()
            .set_last_block(chunk.last().unwrap().end_block)
            .send()
            .unwrap();

        delete_handles.push(tokio::spawn(async move {
            delete_s3_results(&invocations).await;
        }));
    }

    join_all(delete_handles).await;

    Ok(())
}

async fn invoke_lambdas(configs: &[BlockConfig]) -> Vec<Result<InvocationResponse, BoxError>> {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let syncer_config = load_config_from_env();
    let sdk =
        log_fetcher_sdk::LambdaLogFetcherSdk::new_from_config(syncer_config.function_name, &config);

    let lambda_invocation_futures: Vec<_> = configs
        .iter()
        .map(|config| {
            sdk.handle(InvocationRequest {
                id: config.id.clone(),
                start_block: config.start_block,
                end_block: config.end_block,
            })
        })
        .collect();

    return join_all(lambda_invocation_futures).await;
}

async fn get_s3_results(
    invocations: &Vec<Result<InvocationResponse, BoxError>>,
) -> Vec<Vec<IngestTransaction>> {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let s3_client = aws_sdk_s3::Client::new(&config);

    let mut s3_result_futures = Vec::new();
    for invocation in invocations {
        let response = match invocation {
            Ok(v) => v,
            Err(e) => panic!("Invocation Error: {e}"),
        };

        if let InvocationResponse::Transactions {
            s3_bucket,
            s3_prefix,
            size: _,
        } = response
        {
            s3_result_futures.push(
                s3_client
                    .get_object()
                    .bucket(s3_bucket.to_string())
                    .key(s3_prefix.to_string())
                    .send()
                    .and_then(move |r| async move {
                        let data = r.body.collect().await.unwrap();
                        let content =
                            String::from_utf8(data.into_bytes().to_vec()).expect("Invalid UTF-8");

                        let data: Vec<IngestTransaction> = serde_json::from_str(&content).unwrap();
                        Ok(data)
                    }),
            );
        }
    }

    join_all(s3_result_futures)
        .await
        .into_iter()
        .map(|f| f.unwrap())
        .collect::<Vec<Vec<IngestTransaction>>>()
}

async fn delete_s3_results(invocations: &Vec<Result<InvocationResponse, BoxError>>) {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let s3_client = aws_sdk_s3::Client::new(&config);

    let mut s3_deletion_futures = Vec::new();
    for invocation in invocations {
        let response = match invocation {
            Ok(v) => v.to_owned(),
            Err(e) => panic!("Invocation Error: {e}"),
        };

        if let InvocationResponse::Transactions {
            s3_bucket,
            s3_prefix,
            size: _,
        } = response
        {
            s3_deletion_futures.push(
                s3_client
                    .delete_object()
                    .bucket(s3_bucket)
                    .key(s3_prefix)
                    .send(),
            );
        }
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

pub struct Config {
    pub handler_id: String,
    pub handler_version: String,
    pub start_block: u64,
    pub end_block: u64,
    pub function_name: String,
    pub tx_queue_url: String,
}

pub fn load_config_from_env() -> Config {
    return Config {
        handler_id: env::var("HANDLER_ID").expect("Handler ID not set"),
        handler_version: env::var("HANDLER_VERSION").expect("Handler ID not set"),
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
