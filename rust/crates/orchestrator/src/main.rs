use std::collections::HashMap;
use std::env;
use std::str::FromStr;

use aws_lambda_events::event::sns::SnsEvent;
use aws_sdk_ecs::types::{
    AwsVpcConfiguration, ContainerOverride, KeyValuePair, NetworkConfiguration, TaskOverride,
};
use config::Config;
use futures::future::join_all;
use lambda_http::tracing::Instrument;
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};
use sentry::protocol::Context;
use shared::contract_info::EtherscanContractInfoProvider;
use shared::manifest::providers::{InitBlockProvider, InitBlockProviderImpl};
use shared::networks::{get_supported_network, SupportedNetwork};
use shared::redis_client::RedisClientImpl;
use shared::syncer::ChainSyncer;
use shared::{
    enqueuer::SQSTransactionEnqueuer, fetcher::TransactionFetcherImpl, manifest::Manifest,
    redis_client::RedisClient, syncing::State, web3_client::Web3ClientImpl,
};
use std::collections::BTreeMap;
use tokio::sync::OnceCell;
use tracing::{span, Level};
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::prelude::*;
use tracing_subscriber::EnvFilter;

mod config;

static MANIFEST: OnceCell<Manifest> = OnceCell::const_new();
static WEB3_CLIENTS: OnceCell<HashMap<u64, Web3ClientImpl>> = OnceCell::const_new();

#[tracing::instrument(skip_all)]
async fn get_manifest() -> &'static Manifest {
    MANIFEST
        .get_or_init(|| async { Manifest::from_env().await.unwrap() })
        .await
}

#[tracing::instrument(skip_all)]
async fn get_web3_client(chain_id: &u64, config: &Config) -> &'static Web3ClientImpl {
    WEB3_CLIENTS
        .get_or_init(|| async {
            let supported_network = get_supported_network(*chain_id).unwrap();

            HashMap::from_iter(config.chains.iter().map(|c| {
                (
                    c.chain_id,
                    Web3ClientImpl::new(c.chain_id, supported_network.polling_urls.clone()),
                )
            }))
        })
        .await
        .get(&chain_id)
        .unwrap()
}

fn init_sentry(config: &Config) -> sentry::ClientInitGuard {
    sentry::init(("https://c749dc7d2929977538ed3abbd4fbdb4a@o4507692210454528.ingest.de.sentry.io/4507692217729104", sentry::ClientOptions {
      release: Some(std::borrow::Cow::Owned(config.release_name())),
      traces_sample_rate: 0.05,
      ..Default::default()
    }))
}

fn configure_sentry_scope(config: &Config) {
    sentry::configure_scope(|scope| {
        scope.set_user(Some(sentry::User {
            id: Some(config.project_id.clone()),
            ..Default::default()
        }));

        scope.set_context(
            "deployment",
            Context::Other(BTreeMap::from_iter(vec![
                (
                    "deployment_id".to_string(),
                    config.deployment_id.clone().into(),
                ),
                ("function_id".to_string(), config.function_id.clone().into()),
            ])),
        );
    });
}

fn main() -> Result<(), Error> {
    let config = Config::new();
    let _guard = init_sentry(&config);

    configure_sentry_scope(&config);

    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            // let log_format = env::var("AWS_LAMBDA_LOG_FORMAT").unwrap_or_default();
            let log_level = Level::from_str(&env::var("AWS_LAMBDA_LOG_LEVEL").unwrap_or_default())
                .unwrap_or(Level::INFO);

            tracing_subscriber::registry()
                .with(
                    tracing_subscriber::fmt::layer()
                        .with_ansi(false)
                        .with_target(false)
                        .without_time()
                        .with_filter(
                            EnvFilter::builder()
                                .with_default_directive(LevelFilter::from_level(log_level).into())
                                .from_env_lossy(),
                        ),
                )
                .with(sentry_tracing::layer())
                .init();

            run(service_fn(function_handler)).await
        })
}

async fn function_handler(event: LambdaEvent<SnsEvent>) -> Result<(), Error> {
    let incoming_blocks: HashMap<u64, u64> =
        serde_json::from_str(event.payload.records.last().unwrap().sns.message.as_str())?;
    tracing::info!("Incoming blocks: {incoming_blocks:?}");

    let config = Config::new();

    let futures = config.chains.iter().map(|chain_config| {
        let block_for_chain = incoming_blocks.get(&chain_config.chain_id).unwrap().clone();
        let config = &config;
        sync_chain(config, chain_config.clone(), block_for_chain)
    });

    let errors: Vec<_> = join_all(futures)
        .await
        .into_iter()
        .filter(|res| res.is_err())
        .map(Result::unwrap_err)
        .collect();

    if !errors.is_empty() {
        tracing::error!("Failed to sync with errors: {:?}", errors);
    }

    Ok(())
}

#[tracing::instrument(skip_all, err)]
async fn sync_chain(
    config: &Config,
    chain_config: SupportedNetwork,
    incoming_block: u64,
) -> Result<(), errors::OrchestratorError> {
    let sdk_config = aws_config::load_from_env().await;
    let ecs_client = aws_sdk_ecs::Client::new(&sdk_config);
    let web3_client = get_web3_client(&chain_config.chain_id, config).await;
    let fetcher = TransactionFetcherImpl::new(web3_client.clone());
    let s3_client = aws_sdk_s3::Client::new(&sdk_config);
    let sqs_client = aws_sdk_sqs::Client::new(&sdk_config);
    let enqueuer =
        SQSTransactionEnqueuer::new(s3_client, chain_config.tx_queue_url.clone(), sqs_client);
    let manifest = get_manifest().await;
    let redis_client = RedisClientImpl::new().await;
    let init_block_provider = InitBlockProviderImpl::new(
        &manifest,
        web3_client.clone(),
        EtherscanContractInfoProvider::new(
            chain_config.etherscan_api_key.clone(),
            chain_config.etherscan_like.clone(),
        ),
    );

    let mut pipeline = State::load(
        config.function_id.clone(),
        chain_config.chain_id,
        config.deployment_id.clone(),
        redis_client,
    )
    .await?;

    if pipeline.has_synced(incoming_block) || pipeline.is_batch_syncing() {
        tracing::info!(
          target: "orchestrator",
          is_batch_syncing=pipeline.is_batch_syncing(),
          has_synced=pipeline.has_synced(incoming_block)
        );
        return Ok(());
    }

    let start_block = match pipeline.next_block() {
        Some(next_block) => next_block,
        None => init_block_provider.get_init_block().await?,
    };

    if incoming_block - start_block > 10000 {
        return sync_with_ecs(
            chain_config.chain_id,
            &ecs_client,
            &mut pipeline,
            start_block,
            incoming_block,
            &config,
        )
        .await;
    }

    ChainSyncer::new(manifest.clone(), enqueuer, fetcher)
        .sync(&mut pipeline, start_block, incoming_block)
        .await?;

    Ok(())
}

async fn sync_with_ecs<T: RedisClient>(
    chain_id: u64,
    ecs_client: &aws_sdk_ecs::Client,
    pipeline: &mut State<T>,
    start_block: u64,
    end_block: u64,
    config: &Config,
) -> Result<(), errors::OrchestratorError> {
    pipeline
        .update()
        .set_state(shared::syncing::BatchSyncState::Syncing)
        .send()
        .await?;

    let client_result = ecs_client
        .run_task()
        .cluster(&config.syncer_cluster)
        .task_definition(&config.syncer_task_definition_arn)
        .launch_type(aws_sdk_ecs::types::LaunchType::Fargate)
        .network_configuration(get_network_configuration(config.syncer_subnets.clone()))
        .overrides(get_task_override(chain_id, &config, start_block, end_block))
        .send()
        .await;

    if let Err(e) = client_result {
        pipeline
            .update()
            .set_state(shared::syncing::BatchSyncState::Idle)
            .send()
            .await?;

        return Err(errors::OrchestratorError::SdkError(e));
    }

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
                    create_key_value_pair("CHAIN_ID", &chain_config.chain_id.to_string()),
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

mod errors {
    use thiserror::Error;

    #[derive(Debug, Error)]
    pub enum OrchestratorError {
        #[error("Manifest error: {0}")]
        ManifestError(#[from] shared::manifest::errors::ManifestFromEnvError),
        #[error("Web3 client error: {0}")]
        Web3ClientError(#[from] shared::web3_client::errors::Web3ClientError),
        #[error("Contract info provider error: {0}")]
        ContractInfoProviderError(
            #[from] shared::contract_info::errors::EtherscanContractInfoProviderError,
        ),
        #[error("Redis client error: {0}")]
        RedisClientError(#[from] shared::redis_client::errors::RedisClientError),
        #[error("Syncer error: {0}")]
        SyncerError(#[from] shared::syncer::errors::ChainSyncerError),
        #[error("Init block provider error: {0}")]
        InitBlockProviderError(#[from] shared::manifest::providers::InitBlockProviderError),
        #[error("Sdk error: {0}")]
        SdkError(
            #[from] aws_sdk_ecs::error::SdkError<aws_sdk_ecs::operation::run_task::RunTaskError>,
        ),
        #[error("State error: {0}")]
        StateError(#[from] shared::syncing::errors::StateError),
    }
}
