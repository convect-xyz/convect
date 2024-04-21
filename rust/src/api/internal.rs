use futures::future::join_all;
use std::io::Read;
use std::str::FromStr;
use std::{collections::HashMap, env};
use web3::{
    transports::Http,
    types::{FilterBuilder, Log, H160, H256},
    Web3,
};

use crate::manifest::{LogConfig, TransactionConfig};

use crate::proto::{IngestLog, IngestLogGroup, IngestTransaction};

pub struct GetTransactionResult {
    pub transactions: Vec<IngestTransaction>,
}

pub struct GetTransactionWithLogsRequest<'a> {
    pub start_block: u64,
    pub end_block: u64,
    pub tx_config: &'a TransactionConfig,
}

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

pub async fn get_ingest_transactions<'a>(
    request: GetTransactionWithLogsRequest<'a>,
) -> Result<GetTransactionResult, web3::Error> {
    let transport: Http = web3::transports::Http::new(
        env::var("NODE_ENDPOINT")
            .expect("NODE_ENDPOINT is undefined")
            .as_str(),
    )?;
    let web3: Web3<Http> = web3::Web3::new(transport);
    let tx_config = request.tx_config;

    let log_futures =
        join_all(tx_config.log_configs.iter().map(|config| {
            get_logs_for_config(&web3, config, request.start_block, request.end_block)
        }))
        .await;

    let mut tx_indexes: HashMap<H256, usize> = HashMap::new();
    let mut txs: Vec<IngestTransaction> = Vec::new();

    for log in log_futures.into_iter().flatten() {
        let tx_hash = log.transaction_hash.unwrap();

        if !tx_indexes.contains_key(&tx_hash) {
            tx_indexes.insert(tx_hash.clone(), txs.len());

            txs.push(IngestTransaction {
                id: tx_config.id.to_string(),
                block_number: log.block_number.unwrap().as_u64(),
                transaction_index: log.transaction_index.unwrap().as_u64(),
                transaction_hash: format!("{:#x}", log.transaction_hash.unwrap()),
                groups: HashMap::new(),
            });
        }

        let tx_index = tx_indexes.get(&tx_hash).unwrap().clone();
        let mut transaction = txs.get(tx_index).unwrap().clone();

        let log_config = tx_config
            .log_configs
            .iter()
            .find(|log_config| {
                let config_event_topic = log_config.topics.first().unwrap().to_ascii_lowercase();
                let log_event_topic = format!("{:#x}", log.topics.first().unwrap())
                    .strip_prefix("0x")
                    .unwrap()
                    .to_ascii_lowercase();

                config_event_topic.eq(&log_event_topic)
            })
            .map(|config| config)
            .unwrap();

        if !transaction.groups.contains_key(&log_config.name) {
            transaction
                .groups
                .insert(log_config.name.clone(), IngestLogGroup { logs: Vec::new() });
        }

        let mut logs_for_log_type = transaction.groups.get(&log_config.name).unwrap().clone();
        logs_for_log_type.logs.push(IngestLog {
            address: format!("{:#x}", log.address),
            topics: log
                .topics
                .iter()
                .map(|topic| format!("{:#x}", topic))
                .collect(),
            data: String::from_utf8(log.data.0).unwrap(),
            block_hash: format!("{:#x}", log.block_hash.unwrap()),
            block_number: log.block_number.unwrap().as_u64(),
            transaction_hash: format!("{:#x}", log.transaction_hash.unwrap()),
            transaction_index: log.transaction_index.unwrap().as_u64(),
            log_index: log.log_index.unwrap().as_u64(),
            transaction_log_index: 0,
            log_type: String::from(""),
            removed: log.removed.unwrap(),
        });
        transaction
            .groups
            .insert(log_config.name.clone(), logs_for_log_type);

        txs[tx_index] = transaction;
    }

    Ok(GetTransactionResult { transactions: txs })
}
