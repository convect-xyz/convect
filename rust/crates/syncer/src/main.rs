use futures::future::join_all;
use serde::Serialize;
use shared::{
    enqueuer::{SQSTransactionEnqueuer, TransactionEnqueuer},
    fetcher::{TransactionFetcher, TransactionFetcherImpl},
    types::{self, manifest::Manifest, syncing::State, transactions::IngestTransaction},
};
use std::env;
use std::error::Error;

#[derive(Serialize, Debug, Clone)]
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
        syncer_config.function_id.clone(),
        syncer_config.chain_id.clone().to_string(),
        syncer_config.deployment_id.clone(),
    );
    let config = aws_config::load_from_env().await;
    let s3_client = aws_sdk_s3::Client::new(&config);
    let sqs_client = aws_sdk_sqs::Client::new(&config);
    let enqueuer = SQSTransactionEnqueuer::new(s3_client, syncer_config.tx_queue_url, sqs_client);

    let result = run(enqueuer, &mut pipeline).await;

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

async fn run(
    enqueuer: impl TransactionEnqueuer,
    pipeline: &mut State,
) -> Result<(), Box<dyn Error>> {
    let syncer_config = load_config_from_env();
    let configs = get_block_configs(
        syncer_config.start_block,
        syncer_config.end_block,
        BATCH_SIZE,
    );
    let manifest = Manifest::from_env().await.unwrap();

    println!("Configs: {:?}", configs);
    for chunk in configs.chunks(70) {
        let transactions: Vec<Vec<IngestTransaction>> = join_all(chunk.iter().map(|range| {
            let range = range.clone();
            let manifest = manifest.clone();
            async move {
                let fetcher = TransactionFetcherImpl::new();

                match fetcher
                    .get_transactions_in_range(
                        &manifest,
                        syncer_config.chain_id,
                        range.start_block,
                        range.end_block,
                    )
                    .await
                {
                    Ok(txs) => txs,
                    Err(e) => panic!("Failed to fetch transactions: {:?}", e),
                }
            }
        }))
        .await
        .into_iter()
        .collect();

        let flattened: Vec<IngestTransaction> = transactions.into_iter().flatten().collect();
        enqueuer.enqueue_transactions(pipeline, &flattened).await?;

        pipeline
            .update()
            .set_last_block(chunk.last().unwrap().end_block)
            .send()
            .unwrap();
    }

    Ok(())
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
    pub function_id: String,
    pub chain_id: u64,
    pub start_block: u64,
    pub end_block: u64,
    pub tx_queue_url: String,
    pub deployment_id: String,
}

pub fn load_config_from_env() -> Config {
    return Config {
        function_id: env::var("FUNCTION_ID").expect("Function ID not set"),
        chain_id: env::var("CHAIN_ID")
            .expect("Chain ID not set")
            .parse()
            .expect("Chain ID not a u64"),
        start_block: env::var("START_BLOCK")
            .expect("START_BLOCK is not present")
            .parse()
            .expect("START_BLOCK is not a u64"),
        end_block: env::var("END_BLOCK")
            .expect("END_BLOCK is not present")
            .parse()
            .expect("END_BLOCK is not a u64"),
        tx_queue_url: env::var("TRANSACTION_QUEUE_URL")
            .expect("TRANSACTION_QUEUE_URL is not present"),
        deployment_id: env::var("DEPLOYMENT_ID").expect("DEPLOYMENT_ID is not present"),
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
