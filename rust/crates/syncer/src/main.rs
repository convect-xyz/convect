use config::load_config_from_env;
use shared::{
    enqueuer::SQSTransactionEnqueuer, fetcher::TransactionFetcherImpl, manifest::Manifest,
    redis_client::RedisClientImpl, syncer::ChainSyncer, syncing::State,
    web3_client::Web3ClientImpl,
};
use std::error::Error;

mod config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let syncer_config = load_config_from_env();
    let redis_client = RedisClientImpl::new().await;
    let mut pipeline = State::load(
        syncer_config.function_id.clone(),
        syncer_config.chain_id.clone(),
        syncer_config.deployment_id.clone(),
        redis_client,
    )
    .await?;
    let config = aws_config::load_from_env().await;
    let s3_client = aws_sdk_s3::Client::new(&config);
    let sqs_client = aws_sdk_sqs::Client::new(&config);
    let fetcher = TransactionFetcherImpl::new(Web3ClientImpl::new(
        syncer_config.chain_id,
        syncer_config.node_endpoint,
    ));
    let enqueuer = SQSTransactionEnqueuer::new(s3_client, syncer_config.tx_queue_url, sqs_client);
    let manifest = Manifest::from_env().await.unwrap();
    let syncer = ChainSyncer::new(manifest, enqueuer, fetcher);

    syncer
        .sync(
            &mut pipeline,
            syncer_config.start_block,
            syncer_config.end_block,
        )
        .await?;

    Ok(())
}
