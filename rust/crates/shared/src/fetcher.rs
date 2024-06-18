use aws_sdk_s3::error::BoxError;
use futures::future::join_all;
use futures::Future;
use std::cmp::{max, Ordering};
use std::collections::HashMap;
use web3::types::{Log, H256};

use crate::types::manifest::Manifest;
use crate::types::transactions::{IngestLog, IngestTransaction};
use crate::web3_client::{Web3Client, Web3ClientImpl};

pub trait TransactionFetcher {
    fn get_transactions(
        &self,
        manifest: &Manifest,
        start_block: u64,
        end_block: u64,
    ) -> impl Future<Output = Result<Vec<IngestTransaction>, BoxError>>;
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
    async fn get_transactions(
        &self,
        manifest: &Manifest,
        start_block: u64,
        end_block: u64,
    ) -> Result<Vec<IngestTransaction>, BoxError> {
        let log_futures = manifest
            .log_configs
            .iter()
            .filter(|log_config| {
                log_config.tx_configs.iter().any(|tx_config_idx| {
                    let tx_config = &manifest.tx_configs[tx_config_idx.clone() as usize];
                    let tx_start_block =
                        u64::try_from(tx_config.start_block).expect("Could not convert to u64");

                    start_block >= tx_start_block || end_block >= tx_start_block
                })
            })
            .map(|log_config| {
                let min_start_block = log_config
                    .tx_configs
                    .iter()
                    .map(|idx| manifest.tx_configs[idx.clone() as usize].start_block)
                    .min()
                    .expect("Tx configs were empty for this log");

                self.web3_client.get_logs_for_config(
                    log_config,
                    max(
                        start_block,
                        u64::try_from(min_start_block).expect("Start block"),
                    ),
                    end_block,
                )
            });

        let all_logs: Result<Vec<Vec<Log>>, BoxError> =
            join_all(log_futures).await.into_iter().collect();

        let mut tx_indexes: HashMap<H256, usize> = HashMap::new();
        let mut txs: Vec<IngestTransaction> = Vec::new();

        let id = uuid::Uuid::new_v4();
        for log in all_logs?.into_iter().flatten() {
            let tx_hash = log.transaction_hash.unwrap();

            if !tx_indexes.contains_key(&tx_hash) {
                tx_indexes.insert(tx_hash.clone(), txs.len());

                txs.push(IngestTransaction {
                    block_number: log.block_number.unwrap().as_u64(),
                    block_hash: format!("{:#x}", log.block_hash.unwrap()),
                    transaction_index: log.transaction_index.unwrap().as_u64(),
                    batch_id: id.to_string(),
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
