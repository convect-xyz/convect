use config::load_config_from_env;
use shared::{
    configuration::{EnvironmentConfig, RefreshingEnvironmentConfig},
    connection::establish_connection_pool,
    enqueuer::SQSTransactionEnqueuer,
    fetcher::TransactionFetcherImpl,
    manifest::Manifest,
    networks::get_supported_network,
    redis_client::RedisClientImpl,
    syncer::ChainSyncer,
    syncing::State,
    telemetry::StripeProcessedTransactionTelemetry,
};
use std::{error::Error, sync::Arc};

mod config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let syncer_config = load_config_from_env()?;
    let configuration = RefreshingEnvironmentConfig::new().await.get_config().await;
    let redis_client = RedisClientImpl::new(&configuration.redis.url).await?;
    let mut pipeline = State::load(
        syncer_config.project_id.clone(),
        syncer_config.function_id.clone(),
        syncer_config.chain_id.clone(),
        syncer_config.deployment_id.clone(),
        Arc::new(redis_client),
    )
    .await?;
    let network = get_supported_network(syncer_config.chain_id).await.unwrap();
    let config = aws_config::load_from_env().await;
    let s3_client = aws_sdk_s3::Client::new(&config);
    let sqs_client = aws_sdk_sqs::Client::new(&config);
    let fetcher = TransactionFetcherImpl::with_defaults(network.id).await;
    let pool = establish_connection_pool().await;
    let manifest = Manifest::from_env().await.unwrap();
    let enqueuer = SQSTransactionEnqueuer::new(
        s3_client,
        syncer_config.transaction_queue_url,
        sqs_client,
        pool,
        syncer_config.chain_id,
        manifest.clone(),
        StripeProcessedTransactionTelemetry::new(syncer_config.stripe_customer_id.clone()),
    );

    let sync_result = ChainSyncer::new(&manifest, &enqueuer, &fetcher)
        .sync(
            &mut pipeline,
            syncer_config.start_block,
            syncer_config.end_block,
        )
        .await;

    match &sync_result {
        Ok(_) => {
            pipeline
                .update()
                .set_state(shared::syncing::BatchSyncState::Idle)
                .send()
                .await?
        }
        Err(_) => {
            pipeline
                .update()
                .set_state(shared::syncing::BatchSyncState::Failed)
                .send()
                .await?
        }
    }

    sync_result.unwrap();

    Ok(())
}
