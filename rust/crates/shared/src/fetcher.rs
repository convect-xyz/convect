use aws_sdk_s3::error::BoxError;
use futures::Future;
use std::cmp::{max, Ordering};
use std::collections::HashMap;
use std::str::FromStr;
use tokio_retry::strategy::{jitter, ExponentialBackoff};
use tokio_retry::Retry;
use web3::types::{Filter, FilterBuilder, Log, H160, H256};

use crate::types::manifest::{self, LogConfig, Manifest, TransactionConfig};
use crate::types::transactions::{IngestLog, IngestTransaction};
use crate::web3_client::{Web3Client, Web3ClientImpl};

pub trait TransactionFetcher {
    fn get_transactions_in_range(
        &self,
        manifest: &Manifest,
        chain_id: u64,
        start_block: u64,
        end_block: u64,
    ) -> impl Future<Output = Result<Vec<IngestTransaction>, BoxError>>;
}

pub struct TransactionFetcherImpl<T: Web3Client> {
    web3_client: T,
}

impl<T: Web3Client> TransactionFetcherImpl<T> {
    pub fn new_from_client(web3_client: T) -> Self {
        Self { web3_client }
    }

    fn get_log_configs_in_range<'a>(
        &'a self,
        manifest: &'a Manifest,
        range_start: u64,
        range_end: u64,
    ) -> Vec<&'a LogConfig> {
        let has_tx_config_in_range = |log_config: &&LogConfig| {
            log_config.tx_configs.iter().any(|tx_config_idx| {
                let tx_cfg = &manifest.tx_configs[tx_config_idx.clone() as usize];
                let tx_cfg_start_block =
                    u64::try_from(tx_cfg.start_block).expect("Could not convert to u64");

                range_start >= tx_cfg_start_block
            })
        };

        manifest
            .log_configs
            .iter()
            .filter(has_tx_config_in_range)
            .collect()
    }

    fn get_address_for_chain(&self, address_map: &manifest::LogOrigin, chain_id: u64) -> String {
        match address_map {
            manifest::LogOrigin::String(address) => address.clone(),
            manifest::LogOrigin::Map(address_map) => {
                let address = address_map
                    .get(&chain_id)
                    .expect(format!("No address found for chain id {}", chain_id).as_str());
                address.clone()
            }
        }
    }

    /**
      Returns a Filter that covers all the logs that are relevant to the given range.
      The Filter is constructed by:

      * taking all log config addresses and topics that are relevant to the current range.
      * taking the smallest start block of all the tx_configs as the start block that are relevant to the current range.

      After a response is returned from the web3 client, any extraneous logs that are not relevant to the Manifest should be removed with
      the remove_extranous_logs method.
    */
    fn get_web3_client_filter(
        &self,
        tx_configs: &Vec<TransactionConfig>,
        log_configs: &Vec<&LogConfig>,
        chain_id: u64,
        range_start: u64,
        range_end: u64,
    ) -> Filter {
        let addresses = log_configs
            .iter()
            .map(|c| {
                H160::from_str(self.get_address_for_chain(&c.address, chain_id).as_str()).unwrap()
            })
            .collect();

        let topics = log_configs
            .iter()
            .map(|c| H256::from_str(c.topics[0].as_str()).unwrap())
            .collect();

        let smallest_tx_cfg_start_block = log_configs
            .iter()
            .map(|c| {
                c.tx_configs
                    .iter()
                    .map(|idx| tx_configs[*idx as usize].start_block)
                    .min()
                    .unwrap()
            })
            .min()
            .unwrap();

        let start_block = max(
            u64::try_from(smallest_tx_cfg_start_block).expect("Could not convert to u64"),
            range_start,
        );

        FilterBuilder::default()
            .address(addresses)
            .topics(Some(topics), None, None, None)
            .from_block(web3::types::BlockNumber::Number(start_block.into()))
            .to_block(web3::types::BlockNumber::Number(range_end.into()))
            .build()
    }

    fn remove_extranous_logs(
        &self,
        manifest: &Manifest,
        chain_id: u64,
        logs: Vec<Log>,
    ) -> Vec<Log> {
        let has_matching_log_cfg = |log: &Log| {
            manifest.log_configs.iter().any(|log_cfg| {
                let parsed_cfg_address = H160::from_str(
                    self.get_address_for_chain(&log_cfg.address, chain_id)
                        .as_str(),
                )
                .expect(
                    format!(
                        "Could not convert to H256: {}",
                        self.get_address_for_chain(&log_cfg.address, chain_id)
                    )
                    .as_str(),
                );

                let parsed_cfg_topic = H256::from_str(log_cfg.topics[0].as_str())
                    .expect(format!("Could not convert to H256: {}", log_cfg.topics[0]).as_str());

                log.address.eq(&parsed_cfg_address) && log.topics[0].eq(&parsed_cfg_topic)
            })
        };

        logs.into_iter()
            .filter(|log| has_matching_log_cfg(log))
            .collect()
    }
}

impl TransactionFetcherImpl<Web3ClientImpl> {
    pub fn new() -> Self {
        Self {
            web3_client: Web3ClientImpl::new(),
        }
    }
}

impl<T: Web3Client> TransactionFetcher for TransactionFetcherImpl<T> {
    async fn get_transactions_in_range(
        &self,
        manifest: &Manifest,
        chain_id: u64,
        range_start: u64,
        range_end: u64,
    ) -> Result<Vec<IngestTransaction>, BoxError> {
        let eligible_log_cfgs: Vec<_> =
            self.get_log_configs_in_range(manifest, range_start, range_end);

        let filter = self.get_web3_client_filter(
            &manifest.tx_configs,
            &eligible_log_cfgs,
            chain_id,
            range_start,
            range_end,
        );

        let retry_strategy = ExponentialBackoff::from_millis(10).map(jitter).take(3);
        let fetched_logs = Retry::spawn(retry_strategy, || async {
            Ok::<_, BoxError>(self.web3_client.get_logs(filter.clone()).await?)
        })
        .await?;

        let logs: Vec<_> = self.remove_extranous_logs(manifest, chain_id, fetched_logs);

        let mut tx_indices: HashMap<H256, usize> = HashMap::new();
        let mut txs: Vec<IngestTransaction> = Vec::new();

        let id = uuid::Uuid::new_v4();
        for log in logs.into_iter() {
            let tx_hash = log.transaction_hash.unwrap();

            if !tx_indices.contains_key(&tx_hash) {
                tx_indices.insert(tx_hash.clone(), txs.len());

                txs.push(IngestTransaction {
                    block_number: log.block_number.unwrap().as_u64(),
                    block_hash: format!("{:#x}", log.block_hash.unwrap()),
                    transaction_index: log.transaction_index.unwrap().as_u64(),
                    batch_id: id.to_string(),
                    transaction_hash: format!("{:#x}", log.transaction_hash.unwrap()),
                    logs: Vec::new(),
                });
            }

            let tx_index = tx_indices
                .get(&tx_hash)
                .expect(format!("Could not find index for hash {:?}", tx_hash).as_str())
                .clone();
            let transaction = txs.get_mut(tx_index).unwrap();

            transaction.logs.push(IngestLog {
                address: format!("{:#x}", log.address),
                topics: log.topics.iter().map(|t| format!("{:#x}", t)).collect(),
                data: log.data,
                log_index: log.log_index,
                removed: log.removed,
            });
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::web3_client::Web3Client;
    use std::str::FromStr;
    use web3::types::{Bytes, Log, H160, H256, U256};

    struct MockWeb3Client {
        logs: Vec<Log>,
        expected_filter: Filter,
    }

    impl Web3Client for MockWeb3Client {
        async fn get_logs(&self, filter: Filter) -> Result<Vec<Log>, BoxError> {
            assert_eq!(filter, self.expected_filter);
            Ok(self.logs.clone())
        }

        async fn get_transaction_receipt(
            &self,
            tx_hash: String,
        ) -> Result<Option<web3::types::TransactionReceipt>, BoxError> {
            Ok(None)
        }
    }

    mod get_transactions_in_range {
        use ethers::abi::Hash;

        use super::*;
        use crate::types::manifest::{LogConfig, LogOrigin, Manifest, TransactionConfig};

        #[tokio::test]
        async fn calls_filter_with_correct_params() {
            let manifest = Manifest {
                log_configs: vec![
                    LogConfig {
                        address: LogOrigin::String(
                            "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002".to_string(),
                        ),
                        topics: vec![
                            "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62"
                                .to_string(),
                        ],
                        tx_configs: vec![0],
                    },
                    LogConfig {
                        address: LogOrigin::String(
                            "0x8d9088383506437d8De8897B5cF924a2ac70BBDb".to_string(),
                        ),
                        topics: vec![
                            "0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33"
                                .to_string(),
                        ],
                        tx_configs: vec![1],
                    },
                ],
                tx_configs: vec![
                    TransactionConfig { start_block: 0 },
                    TransactionConfig { start_block: 5 },
                ],
            };

            let logs = vec![
                build_log(
                    "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002",
                    "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62",
                    5,
                    "0x0e2fe9129f6bdd1a524b3a9d12ccb8476b70f69777f73672cf59330cba5a2638",
                ),
                build_log(
                    "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
                    "0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33",
                    5,
                    "0x0e2fe9129f6bdd1a524b3a9d12ccb8476b70f69777f73672cf59330cba5a2638",
                ),
            ];

            let web3_client = MockWeb3Client {
                logs,
                expected_filter: build_filter(
                    vec![
                        "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002",
                        "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
                    ],
                    vec![
                        "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62",
                        "0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33",
                    ],
                    0,
                    10,
                ),
            };

            let fetcher = TransactionFetcherImpl { web3_client };
            let txs = fetcher
                .get_transactions_in_range(&manifest, 1, 0, 10)
                .await
                .unwrap();

            assert_eq!(txs.len(), 1);
            assert_eq!(txs[0].block_number, 5);
            assert_eq!(txs[0].logs.len(), 2);
        }
    }

    fn build_log(address: &str, topic: &str, block_number: u64, transaction_hash: &str) -> Log {
        Log {
            address: H160::from_str(address).unwrap(),
            topics: vec![H256::from_str(topic).unwrap()],
            data: Bytes(vec![]),
            log_index: Some(U256::from(0)),
            transaction_hash: Some(H256::from_str(transaction_hash).unwrap()),
            block_number: Some(block_number.into()),
            block_hash: Some(
                H256::from_str(
                    "0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33",
                )
                .unwrap(),
            ),
            transaction_index: Some(0.into()),
            removed: Some(false),
            transaction_log_index: Some(U256::from_str("0").unwrap()),
            log_type: Some("".to_string()),
        }
    }

    fn build_filter(
        addresses: Vec<&str>,
        topics: Vec<&str>,
        start_block: u64,
        end_block: u64,
    ) -> Filter {
        FilterBuilder::default()
            .address(
                addresses
                    .iter()
                    .map(|a| H160::from_str(a).unwrap())
                    .collect(),
            )
            .topics(
                Some(topics.iter().map(|t| H256::from_str(t).unwrap()).collect()),
                None,
                None,
                None,
            )
            .from_block(web3::types::BlockNumber::Number(start_block.into()))
            .to_block(web3::types::BlockNumber::Number(end_block.into()))
            .build()
    }
}
