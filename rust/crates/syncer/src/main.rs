use config::load_config_from_env;
use shared::{
    enqueuer::SQSTransactionEnqueuer,
    fetcher::graphql::GethGraphqlClientImpl,
    fetcher::TransactionFetcherImpl,
    manifest::Manifest,
    networks::get_supported_network,
    redis_client::RedisClientImpl,
    syncer::{self, ChainSyncer},
    syncing::State,
    web3_client::Web3ClientImpl,
};
use std::{error::Error, sync::Arc};

mod config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let syncer_config = load_config_from_env();
    let redis_client = RedisClientImpl::new().await;
    let mut pipeline = State::load(
        syncer_config.function_id.clone(),
        syncer_config.chain_id.clone(),
        syncer_config.deployment_id.clone(),
        Arc::new(redis_client),
    )
    .await?;
    let network = get_supported_network(syncer_config.chain_id).unwrap();

    let config = aws_config::load_from_env().await;
    let s3_client = aws_sdk_s3::Client::new(&config);
    let sqs_client = aws_sdk_sqs::Client::new(&config);
    let fetcher = TransactionFetcherImpl::new(
        GethGraphqlClientImpl::new(network.polling_urls.first().unwrap().to_string()),
        network.id,
    );
    let enqueuer = SQSTransactionEnqueuer::new(s3_client, syncer_config.tx_queue_url, sqs_client);
    let manifest = Manifest::from_env().await.unwrap();
    let syncer = ChainSyncer::new(&manifest, &enqueuer, &fetcher);

    let sync_result = syncer
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

    sync_result?;

    Ok(())
}
