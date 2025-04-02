use core::sync;
use std::collections::HashMap;
use std::env;
use std::str::FromStr;

use aws_lambda_events::event::sns::SnsEvent;
use aws_sdk_ecs::types::{
    AwsVpcConfiguration, ContainerOverride, KeyValuePair, NetworkConfiguration, TaskOverride,
};
use config::{ChainConfig, Config};
use futures::future::join_all;
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};
use sentry::protocol::Context;
use shared::configuration::EnvironmentConfig;
use shared::syncer::ChainSyncer;
use shared::syncing::State;
use std::collections::BTreeMap;
use tracing::Level;
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::prelude::*;
use tracing_subscriber::EnvFilter;

mod config;
mod service;

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

fn parse_blocks(
    event: &LambdaEvent<SnsEvent>,
) -> Result<HashMap<u64, u64>, errors::OrchestratorError> {
    let incoming_blocks: HashMap<u64, u64> = serde_json::from_str(
        event
            .payload
            .records
            .last()
            .ok_or(errors::OrchestratorError::MissingPayload)?
            .sns
            .message
            .as_str(),
    )?;
    Ok(incoming_blocks)
}

async fn function_handler(event: LambdaEvent<SnsEvent>) -> Result<(), errors::OrchestratorError> {
    let app_service = service::AppService::with_defaults().await;
    let incoming_blocks = parse_blocks(&event)?;
    tracing::info!("Incoming blocks: {incoming_blocks:?}");

    let futures = app_service.config.chains.iter().map(|chain_config| async {
        let chain_id = chain_config.chain_id;
        let latest_block_for_chain = match incoming_blocks.get(&chain_id) {
            Some(block) => Ok(block.clone()),
            None => Err(errors::OrchestratorError::MissingBlockForChain(chain_id)),
        }?;

        sync_chain(&app_service, chain_config.clone(), latest_block_for_chain).await
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
    app_service: &service::AppService,
    chain_config: ChainConfig,
    latest_block: u64,
) -> Result<(), errors::OrchestratorError> {
    let chain_service =
        service::ChainService::with_defaults(&app_service, chain_config.clone()).await;

    let chain_id = chain_service.config.chain_id;
    tracing::info!("Attempting to sync chain {:?}", chain_id);

    let mut sync_state = State::load(
        app_service.config.project_id.clone(),
        app_service.config.function_id.clone(),
        chain_id,
        app_service.config.deployment_id.clone(),
        app_service.redis_client.clone(),
    )
    .await?;

    if sync_state.has_synced(latest_block) || sync_state.is_batch_syncing() {
        tracing::info!(
          target: "orchestrator",
          is_batch_syncing=sync_state.is_batch_syncing(),
          has_synced=sync_state.has_synced(latest_block)
        );
        return Ok(());
    }

    let start_block = sync_state.next_block_to_fetch(&app_service.manifest);

    if latest_block - start_block > 10000 {
        return sync_with_ecs(
            chain_id,
            &app_service.ecs_client,
            &mut sync_state,
            start_block,
            latest_block,
            &app_service.config,
        )
        .await;
    }

    ChainSyncer::new(
        &app_service.manifest,
        chain_service.transaction_enqueuer.as_ref(),
        chain_service.transaction_fetcher.as_ref(),
    )
    .sync(&mut sync_state, start_block, latest_block)
    .await?;

    Ok(())
}

async fn sync_with_ecs(
    chain_id: u64,
    ecs_client: &aws_sdk_ecs::Client,
    pipeline: &mut State,
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

    let shared_config = EnvironmentConfig::new().unwrap();
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
                    create_key_value_pair("DATABASE_URL", &config.database_url),
                    create_key_value_pair("PROJECT_ID", &config.project_id),
                    create_key_value_pair("CONFIG__REDIS__URL", &shared_config.redis.url),
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
        Web3ClientError(#[from] shared::fetcher::web3::client::errors::Web3ClientError),
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
        #[error("Missing block for chain {0}")]
        MissingBlockForChain(u64),
        #[error("Missing payload")]
        MissingPayload,
        #[error("Serde error: {0}")]
        SerdeError(#[from] serde_json::Error),
    }
}
