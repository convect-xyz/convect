use std::{cmp::max, env};

use aws_lambda_events::event::sns::SnsEvent;
use aws_sdk_ecs::types::{
    AwsVpcConfiguration, ContainerOverride, KeyValuePair, NetworkConfiguration, TaskOverride,
};
use futures::{future::join_all, TryFutureExt};
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};
use shared::{
    contract_info::{self, ContractInfoProvider},
    enqueuer::{SQSTransactionEnqueuer, TransactionEnqueuer},
    fetcher::{TransactionFetcher, TransactionFetcherImpl},
    types::{manifest::Manifest, syncing::State},
    web3_client::{Web3Client, Web3ClientImpl},
};

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}

// Make sure we received higher block number only
async fn function_handler(event: LambdaEvent<SnsEvent>) -> Result<(), Error> {
    let config = Config::new();
    let sdk_config = aws_config::load_from_env().await;
    let ecs_client = aws_sdk_ecs::Client::new(&sdk_config);
    let s3_client = aws_sdk_s3::Client::new(&sdk_config);
    let sqs_client = aws_sdk_sqs::Client::new(&sdk_config);
    let fetcher = TransactionFetcherImpl::new();
    let enqueuer =
        SQSTransactionEnqueuer::new(s3_client, config.transation_queue_url.clone(), sqs_client);
    let web3_client = Web3ClientImpl::new();
    let mut pipeline = State::load(config.handler_id.clone(), config.handler_version.clone());

    let incoming_block: u64 = event
        .payload
        .records
        .last()
        .unwrap()
        .sns
        .message
        .parse()
        .expect("Invalid SNS Message");

    if pipeline.last_block().is_some_and(|l| incoming_block <= l) {
        return Ok(());
    }

    if pipeline
        .state()
        .eq(&shared::types::syncing::SyncState::SYNCING)
    {
        return Ok(());
    }

    let init_block: Option<u64> = match pipeline.last_block() {
        Some(_) => None,
        None => {
            let manifest = Manifest::from_env().await.unwrap();
            let manifest_min_block = manifest
                .tx_configs
                .iter()
                .map(|c| u64::try_from(c.start_block).expect("i64 to u64 failed"))
                .min();

            let etherscan_provider = contract_info::EtherscanContractInfoProvider::new(
                env::var("ETHERSCAN_API_KEY").expect("ETHERSCAN_API_KEY not set"),
                env::var("ETHERSCAN_LIKE").expect("ETHERSCAN_LIKE not set"),
            );

            let creation_tx_hashes: Vec<_> = etherscan_provider
                .get_contract_creation_info(
                    manifest
                        .log_configs
                        .iter()
                        .map(|l| l.address.clone())
                        .collect(),
                )
                .await
                .unwrap()
                .iter()
                .map(|c| c.tx_hash.clone())
                .collect();

            let transactions: Result<Vec<_>, _> = join_all(
                creation_tx_hashes
                    .iter()
                    .map(|tx_hash| web3_client.get_transaction_receipt(tx_hash.clone())),
            )
            .await
            .into_iter()
            .collect();

            let contract_min_block = match transactions {
                Ok(receipts) => {
                    let mut min_block = None;

                    for receipt in receipts.iter() {
                        if let Some(receipt) = receipt {
                            let block_number = receipt.block_number.unwrap().as_u64();
                            if min_block.is_none() || block_number < min_block.unwrap() {
                                min_block = Some(block_number);
                            }
                        }
                    }

                    min_block
                }
                Err(e) => {
                    println!("{:?}", e);
                    None
                }
            };

            Some(max(
                contract_min_block.unwrap_or(0),
                manifest_min_block.unwrap_or(0),
            ))
        }
    };

    if incoming_block - pipeline.last_block().or(init_block).unwrap_or(0) > 1999 {
        pipeline
            .update()
            .set_state(shared::types::syncing::SyncState::SYNCING)
            .send()
            .expect("Failed to update pipeline");

        return batch_sync(
            &ecs_client,
            &mut pipeline,
            incoming_block,
            init_block,
            &config,
        )
        .await;
    }

    let from_block = pipeline.last_block().map(|l| l + 1).or(init_block).unwrap();
    let manifest = Manifest::from_env().await.unwrap();
    let transactions = fetcher
        .get_transactions_in_range(&manifest, from_block, incoming_block)
        .inspect_err(|e| {
            println!("{:?}", e);
            pipeline
                .update()
                .set_state(shared::types::syncing::SyncState::FAILED)
                .send()
                .unwrap();
        })
        .await?;

    let result = enqueuer
        .enqueue_transactions(&mut pipeline, &transactions)
        .await;

    match result {
        Ok(_) => pipeline.update().set_last_block(incoming_block).send(),
        Err(_) => pipeline
            .update()
            .set_state(shared::types::syncing::SyncState::FAILED)
            .send(),
    }
    .unwrap();

    Ok(())
}

struct Config {
    transation_queue_url: String,
    handler_id: String,
    handler_version: String,
    manifest_bucket: String,
    manifest_prefix: String,
    syncer_task_definition_arn: String,
    syncer_cluster: String,
    syncer_subnets: Vec<String>,
    version: String,
    syncer_container_name: String,
    node_endpoint: String,
}

impl Config {
    fn new() -> Self {
        Self {
            transation_queue_url: env::var("TRANSACTION_QUEUE_URL")
                .expect("TRANSACTION_QUEUE_URL not set"),
            handler_id: env::var("HANDLER_ID").expect("HANDLER_ID not set"),
            handler_version: env::var("HANDLER_VERSION").expect("HANDLER_VERSION not set"),
            manifest_bucket: env::var("MANIFEST_BUCKET").expect("MANIFEST_BUCKET not set"),
            manifest_prefix: env::var("MANIFEST_PREFIX").expect("MANIFEST_PREFIX not set"),
            syncer_task_definition_arn: env::var("SYNCER_TASK_DEFINITION_ARN")
                .expect("SYNCER_TASK_DEFINITION_ARN not set"),
            syncer_cluster: env::var("SYNCER_CLUSTER").expect("SYNCER_CLUSTER not set"),
            syncer_subnets: env::var("SYNCER_SUBNETS")
                .expect("SYNCER_SUBNETS not set")
                .split(",")
                .map(|s| s.to_string())
                .collect(),
            version: env::var("VERSION").expect("VERSION not set"),
            syncer_container_name: env::var("SYNCER_CONTAINER_NAME")
                .expect("SYNCER_CONTAINER_NAME not set"),
            node_endpoint: env::var("NODE_ENDPOINT").expect("NODE_ENDPOINT not set"),
        }
    }
}

async fn batch_sync(
    ecs_client: &aws_sdk_ecs::Client,
    pipeline: &mut State,
    incoming_block: u64,
    init_block: Option<u64>,
    config: &Config,
) -> Result<(), Error> {
    ecs_client
        .run_task()
        .cluster(&config.syncer_cluster)
        .task_definition(&config.syncer_task_definition_arn)
        .launch_type(aws_sdk_ecs::types::LaunchType::Fargate)
        .network_configuration(get_network_configuration(config.syncer_subnets.clone()))
        .overrides(get_task_override(
            &config,
            pipeline.last_block().map(|l| l + 1).or(init_block).unwrap(),
            incoming_block,
        ))
        .send()
        .await
        .inspect_err(|e| {
            println!("{:?}", e);

            pipeline
                .update()
                .set_state(shared::types::syncing::SyncState::IDLE)
                .send()
                .unwrap();
        })?;

    Ok(())
}

fn get_network_configuration(subnets: Vec<String>) -> NetworkConfiguration {
    NetworkConfiguration::builder()
        .awsvpc_configuration(
            AwsVpcConfiguration::builder()
                .set_subnets(Some(subnets))
                .assign_public_ip(aws_sdk_ecs::types::AssignPublicIp::Enabled)
                .build()
                .unwrap(),
        )
        .build()
}
fn get_task_override(config: &Config, start_block: u64, end_block: u64) -> TaskOverride {
    TaskOverride::builder()
        .container_overrides(
            ContainerOverride::builder()
                .name(&config.syncer_container_name)
                .set_environment(Some(vec![
                    create_key_value_pair("START_BLOCK", &start_block.to_string()),
                    create_key_value_pair("END_BLOCK", &end_block.to_string()),
                    create_key_value_pair("TRANSACTION_QUEUE_URL", &config.transation_queue_url),
                    create_key_value_pair("NODE_ENDPOINT", &config.node_endpoint),
                    create_key_value_pair("HANDLER_ID", &config.handler_id),
                    create_key_value_pair("HANDLER_VERSION", &config.handler_version),
                    create_key_value_pair("VERSION", &config.version),
                    create_key_value_pair("MANIFEST_BUCKET", &config.manifest_bucket),
                    create_key_value_pair("MANIFEST_PREFIX", &config.manifest_prefix),
                ]))
                .build(),
        )
        .build()
}

fn create_key_value_pair(name: &str, value: &String) -> KeyValuePair {
    KeyValuePair::builder().name(name).value(value).build()
}
