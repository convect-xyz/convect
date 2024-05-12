use futures::future::join_all;
use std::str::FromStr;
use std::{collections::HashMap, env};
use web3::{
    transports::Http,
    types::{FilterBuilder, Log, H160, H256},
    Web3,
};

use super::{IngestLog, IngestTransaction};
use crate::manifest::LogConfig;

async fn get_logs_for_config(
    web3: &Web3<Http>,
    config: &LogConfig,
    start_block: u64,
    end_block: u64,
) -> Vec<Log> {
    let address = H160::from_str(config.address.as_str()).unwrap();

    let filter = FilterBuilder::default()
        .address(vec![address])
        .from_block(web3::types::BlockNumber::Number(start_block.into()))
        .to_block(web3::types::BlockNumber::Number(end_block.into()))
        .topics(
            Some(vec![
                H256::from_str(&config.topics[0]).expect("Log topic not set")
            ]),
            None,
            None,
            None,
        )
        .build();

    web3.eth().logs(filter).await.unwrap()
}

pub async fn get_ingest_transactions(
    start_block: u64,
    end_block: u64,
    log_configs: &Vec<LogConfig>,
) -> Result<Vec<IngestTransaction>, web3::Error> {
    let transport: Http = web3::transports::Http::new(
        env::var("NODE_ENDPOINT")
            .expect("NODE_ENDPOINT is undefined")
            .as_str(),
    )?;
    let web3: Web3<Http> = web3::Web3::new(transport);

    let log_futures = join_all(
        log_configs
            .iter()
            .map(|config| get_logs_for_config(&web3, config, start_block, end_block)),
    )
    .await;

    let mut tx_indexes: HashMap<H256, usize> = HashMap::new();
    let mut txs: Vec<IngestTransaction> = Vec::new();

    for log in log_futures.into_iter().flatten() {
        let tx_hash = log.transaction_hash.unwrap();

        if !tx_indexes.contains_key(&tx_hash) {
            tx_indexes.insert(tx_hash.clone(), txs.len());

            txs.push(IngestTransaction {
                block_number: log.block_number.unwrap().as_u64(),
                block_hash: format!("{:#x}", log.block_hash.unwrap()),
                transaction_index: log.transaction_index.unwrap().as_u64(),
                transaction_hash: format!("{:#x}", log.transaction_hash.unwrap()),
                logs: Vec::new(),
            });
        }

        let tx_index = tx_indexes.get(&tx_hash).unwrap().clone();
        let mut transaction = txs.get(tx_index).unwrap().clone();

        transaction.logs.push(IngestLog {
            address: format!("{:#x}", log.address),
            topics: log.topics.iter().map(|t| format!("{:#x}", t)).collect(),
            data: log.data,
            log_index: log.log_index,
            removed: log.removed,
        });

        txs[tx_index] = transaction;
    }

    Ok(txs)
}
