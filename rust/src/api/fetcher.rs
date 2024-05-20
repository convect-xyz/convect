use aws_sdk_s3::error::BoxError;
use futures::future::join_all;
use std::cmp::Ordering;
use std::str::FromStr;
use std::{collections::HashMap, env};
use web3::{
    transports::Http,
    types::{FilterBuilder, Log, H160, H256},
    Web3,
};

use crate::types::manifest::{LogConfig, Manifest};
use crate::types::transactions::{IngestLog, IngestTransaction};

pub trait TransactionFetcher {
    async fn get_ingest_transactions(
        &self,
        manifest: &Manifest,
        start_block: u64,
        end_block: u64,
    ) -> Result<Vec<IngestTransaction>, BoxError>;
}

pub struct TransactionFetcherImpl<T: Web3Client> {
    web3_client: T,
}

impl TransactionFetcherImpl<Web3ClientImpl> {
    pub fn new() -> Self {
        Self {
            web3_client: Web3ClientImpl::new(),
        }
    }
}

impl<T: Web3Client> TransactionFetcher for TransactionFetcherImpl<T> {
    async fn get_ingest_transactions(
        &self,
        manifest: &Manifest,
        start_block: u64,
        end_block: u64,
    ) -> Result<Vec<IngestTransaction>, BoxError> {
        let log_futures = join_all(manifest.log_configs.iter().map(|config| {
            self.web3_client
                .get_logs_for_config(config, start_block, end_block)
        }))
        .await;

        let mut tx_indexes: HashMap<H256, usize> = HashMap::new();
        let mut txs: Vec<IngestTransaction> = Vec::new();

        for log_result in log_futures.into_iter() {
            for log in log_result?.into_iter() {
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
        }

        txs.sort_by(|a, b| {
            let block_cmp = a.block_number.cmp(&b.block_number);
            if block_cmp == Ordering::Equal {
                return a.transaction_index.cmp(&b.transaction_index);
            }

            return block_cmp;
        });

        Ok(txs)
    }
}

pub trait Web3Client {
    async fn get_logs_for_config(
        &self,
        config: &LogConfig,
        start_block: u64,
        end_block: u64,
    ) -> Result<Vec<Log>, BoxError>;
}

pub struct Web3ClientImpl {
    web3: Web3<Http>,
}

impl Web3ClientImpl {
    pub fn new() -> Self {
        let transport: Http = web3::transports::Http::new(
            env::var("NODE_ENDPOINT")
                .expect("NODE_ENDPOINT is undefined")
                .as_str(),
        )
        .unwrap();
        let web3: Web3<Http> = web3::Web3::new(transport);

        Self { web3 }
    }
}

impl Web3Client for Web3ClientImpl {
    async fn get_logs_for_config(
        &self,
        config: &LogConfig,
        start_block: u64,
        end_block: u64,
    ) -> Result<Vec<Log>, BoxError> {
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

        let result = self.web3.eth().logs(filter).await?;

        Ok(result)
    }
}
