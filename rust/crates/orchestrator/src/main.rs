use std::{cmp::max, collections::HashMap, env};

use aws_lambda_events::event::sns::SnsEvent;
use aws_sdk_ecs::types::{
    AwsVpcConfiguration, ContainerOverride, KeyValuePair, NetworkConfiguration, TaskOverride,
};
use futures::{future::join_all, TryFutureExt};
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};
use sentry::protocol::Context;
use serde::Deserialize;
use shared::{
    contract_info::{self, ContractInfoProvider},
    enqueuer::{SQSTransactionEnqueuer, TransactionEnqueuer},
    fetcher::{TransactionFetcher, TransactionFetcherImpl},
    types::{manifest::Manifest, syncing::State},
    web3_client::{Web3Client, Web3ClientImpl},
};
use std::collections::BTreeMap;
use tokio::sync::OnceCell;

static MANIFEST: OnceCell<Manifest> = OnceCell::const_new();
static WEB3_CLIENT: OnceCell<Web3ClientImpl> = OnceCell::const_new();

async fn get_manifest() -> &'static Manifest {
    MANIFEST
        .get_or_init(|| async {
            println!("Fetching manifest");
            Manifest::from_env().await.unwrap()
        })
        .await
}

async fn get_web3_client(chain_config: &ChainConfig) -> &'static Web3ClientImpl {
    WEB3_CLIENT
        .get_or_init(|| async {
            println!("Fetching web3 client");
            Web3ClientImpl::new_from_endpoint(chain_config.polling_url.clone())
        })
        .await
}

#[derive(Debug, Deserialize, Clone)]
struct ChainConfig {
    #[serde(rename = "chainId")]
    chain_id: u64,
    #[serde(rename = "pollingUrl")]
    polling_url: String,
    #[serde(rename = "txQueueUrl")]
    tx_queue_url: String,
    #[serde(rename = "etherscanApiKey")]
    etherscan_api_key: String,
    #[serde(rename = "etherscanLike")]
    etherscan_like: String,
}

fn configure_sentry_scope(config: &Config) {
    sentry::configure_scope(|scope| {
        scope.set_user(Some(sentry::User {
            id: Some(config.user_id.clone()),
            ..Default::default()
        }));
        let mut deployment_map = BTreeMap::new();
        deployment_map.insert(
            "deployment_id".to_string(),
            config.deployment_id.clone().into(),
        );
        deployment_map.insert("function_id".to_string(), config.function_id.clone().into());
        scope.set_context("deployment", Context::Other(deployment_map));
    });
}

fn main() -> Result<(), Error> {
    let _guard = sentry::init(("https://c749dc7d2929977538ed3abbd4fbdb4a@o4507692210454528.ingest.de.sentry.io/4507692217729104", sentry::ClientOptions {
      release: sentry::release_name!(),
      ..Default::default()
  }));

    let config = Config::new();
    configure_sentry_scope(&config);

    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            tracing::init_default_subscriber();
            run(service_fn(function_handler)).await
        })
}

async fn function_handler(event: LambdaEvent<SnsEvent>) -> Result<(), Error> {
    let incoming_blocks: HashMap<u64, u64> =
        serde_json::from_str(event.payload.records.last().unwrap().sns.message.as_str())
            .expect("Invalid SNS Message");

    println!("Incoming block: {:?}", incoming_blocks);

    let config = Config::new();
    let futures = config.chains.into_iter().map(|chain_config| {
        let block_for_chain = incoming_blocks.get(&chain_config.chain_id).unwrap().clone();
        async move { sync_chain(chain_config, block_for_chain).await }
    });

    let result = join_all(futures).await;

    for res in result {
        match res {
            Ok(_) => {
                println!("Successfully synced chain");
            }
            Err(e) => {
                println!("Failed to sync chain: {:?}", e);
            }
        }
    }

    Ok(())
}

async fn sync_chain(chain_config: ChainConfig, incoming_block: u64) -> Result<(), Error> {
    let sdk_config = aws_config::load_from_env().await;
    let ecs_client = aws_sdk_ecs::Client::new(&sdk_config);
    let web3_client = get_web3_client(&chain_config).await;
    let fetcher = TransactionFetcherImpl::new_from_client(web3_client.clone());
    let s3_client = aws_sdk_s3::Client::new(&sdk_config);
    let sqs_client = aws_sdk_sqs::Client::new(&sdk_config);
    let enqueuer =
        SQSTransactionEnqueuer::new(s3_client, chain_config.tx_queue_url.clone(), sqs_client);
    let manifest = get_manifest().await;
    let config = Config::new();

    let incoming_block = incoming_block.min(web3_client.get_current_block_number().await?);

    // benchmark this
    let mut pipeline = State::load(
        config.function_id.clone(),
        chain_config.chain_id.to_string(),
        config.deployment_id.clone(),
    );

    if pipeline.last_block().is_some_and(|l| incoming_block <= l) {
        return Ok(());
    }

    if pipeline
        .state()
        .eq(&shared::types::syncing::SyncState::SYNCING)
    {
        return Ok(());
    }

    let init_block: Option<u64> =
        get_init_block(&mut pipeline, manifest, &web3_client, &chain_config).await;
    if incoming_block - pipeline.last_block().or(init_block).unwrap_or(0) > 1999 {
        pipeline
            .update()
            .set_state(shared::types::syncing::SyncState::SYNCING)
            .send()
            .expect("Failed to update pipeline");

        return batch_sync(
            chain_config.chain_id,
            &ecs_client,
            &mut pipeline,
            incoming_block,
            init_block,
            &config,
        )
        .await;
    }

    let from_block = pipeline.last_block().map(|l| l + 1).or(init_block).unwrap();
    let transactions = fetcher
        .get_transactions_in_range(&manifest, chain_config.chain_id, from_block, incoming_block)
        .inspect_err(|_| {
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

#[derive(Debug, Clone)]
struct Config {
    function_id: String,
    manifest_bucket: String,
    manifest_prefix: String,
    syncer_task_definition_arn: String,
    syncer_cluster: String,
    syncer_subnets: Vec<String>,
    version: String,
    syncer_container_name: String,
    deployment_id: String,
    user_id: String,
    chains: Vec<ChainConfig>,
}

impl Config {
    fn new() -> Self {
        Self {
            function_id: env::var("FUNCTION_ID").expect("FUNCTION_ID not set"),
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
            deployment_id: env::var("DEPLOYMENT_ID").expect("DEPLOYMENT_ID not set"),
            user_id: env::var("USER_ID").expect("USER_ID not set"),
            chains: serde_json::from_str(&env::var("CHAINS").expect("CHAINS not set"))
                .expect("CHAINS not set"),
        }
    }
}

async fn batch_sync(
    chain_id: u64,
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
            chain_id,
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

fn get_task_override(
    chain_id: u64,
    config: &Config,
    start_block: u64,
    end_block: u64,
) -> TaskOverride {
    let chain_config = config
        .chains
        .iter()
        .find(|c| c.chain_id == chain_id)
        .unwrap();

    TaskOverride::builder()
        .container_overrides(
            ContainerOverride::builder()
                .name(&config.syncer_container_name)
                .set_environment(Some(vec![
                    create_key_value_pair("START_BLOCK", &start_block.to_string()),
                    create_key_value_pair("END_BLOCK", &end_block.to_string()),
                    create_key_value_pair("TRANSACTION_QUEUE_URL", &chain_config.tx_queue_url),
                    create_key_value_pair("NODE_ENDPOINT", &chain_config.polling_url),
                    create_key_value_pair("CHAIN_ID", &chain_id.to_string()),
                    create_key_value_pair("FUNCTION_ID", &config.function_id),
                    create_key_value_pair("VERSION", &config.version),
                    create_key_value_pair("MANIFEST_BUCKET", &config.manifest_bucket),
                    create_key_value_pair("MANIFEST_PREFIX", &config.manifest_prefix),
                    create_key_value_pair("DEPLOYMENT_ID", &config.deployment_id),
                ]))
                .build(),
        )
        .build()
}

fn create_key_value_pair(name: &str, value: &String) -> KeyValuePair {
    KeyValuePair::builder().name(name).value(value).build()
}

async fn get_min_contract_creation_block(
    web3_client: &Web3ClientImpl,
    manifest: &Manifest,
    chain_config: &ChainConfig,
) -> Result<Option<u64>, Error> {
    let etherscan_provider = contract_info::EtherscanContractInfoProvider::new(
        chain_config.etherscan_api_key.clone(),
        chain_config.etherscan_like.clone(),
    );

    let creation_tx_hashes: Vec<_> = etherscan_provider
        .get_contract_creation_info(
            manifest
                .log_configs
                .iter()
                .map(|l| l.address.get_address(chain_config.chain_id))
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

    println!("Transactions: {:?}", transactions);

    let min_block = match transactions {
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

    println!("Min block: {:?}", min_block);

    Ok(min_block)
}

async fn get_init_block(
    pipeline: &mut State,
    manifest: &Manifest,
    web3_client: &Web3ClientImpl,
    chain_config: &ChainConfig,
) -> Option<u64> {
    println!("{:?}", pipeline.last_block());
    match pipeline.last_block() {
        Some(_) => None,
        None => {
            let manifest_min_block = manifest
                .tx_configs
                .iter()
                .map(|c| c.get_start_block(chain_config.chain_id).unwrap_or(0))
                .min();

            println!("{:?}", manifest_min_block);
            let contract_creation_min_block =
                get_min_contract_creation_block(&web3_client, &manifest, chain_config)
                    .await
                    .unwrap();
            println!("{:?}", contract_creation_min_block);
            Some(max(
                contract_creation_min_block.unwrap_or(0),
                manifest_min_block.unwrap_or(0),
            ))
        }
    }
}
