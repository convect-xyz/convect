pub mod batch {
    use crate::manifest::{LogConfig, Manifest, TransactionConfig};
    use serde::{Deserialize, Serialize};
    #[derive(Deserialize, Serialize, Clone, Debug, PartialEq)]
    pub struct IngestBatch {
        #[serde(rename = "batchId")]
        pub batch_id: String,
        #[serde(rename = "chainId")]
        pub chain_id: u64,
        pub transactions: Vec<IngestBatchTransaction>,
    }

    #[derive(Deserialize, Serialize, Clone, Debug, PartialEq)]
    pub struct IngestBatchTransaction {
        // The actual transaction.
        pub transaction: super::transactions::IngestTransaction,
        // The tx_config indices that this transaction should be processed by.
        #[serde(rename = "txConfigs")]
        pub tx_configs: Vec<i32>,
    }

    impl IngestBatchTransaction {
        pub fn from_transaction(
            manifest: &Manifest,
            chain_id: u64,
            transaction: super::transactions::IngestTransaction,
        ) -> Self {
            let tx_configs = Self::get_tx_configs(manifest, chain_id, &transaction);
            Self {
                transaction,
                tx_configs,
            }
        }

        fn get_tx_configs(
            manifest: &Manifest,
            chain_id: u64,
            transaction: &super::transactions::IngestTransaction,
        ) -> Vec<i32> {
            let is_in_chain = |tx_cfg: &TransactionConfig| {
                tx_cfg
                    .chains
                    .as_ref()
                    .map_or(true, |chains| chains.contains(&(chain_id as i64)))
            };

            let all_log_configs_match = |log_cfgs: &Vec<LogConfig>| {
                log_cfgs.iter().all(|log_cfg| {
                    transaction.logs.iter().any(|log| {
                        println!(
                            "Log Cfg Topics: {:?}. Log Topicss: {:?}",
                            &log_cfg.topics, &log.topics
                        );
                        log_cfg
                            .address
                            .get_address(chain_id)
                            .unwrap()
                            .eq_ignore_ascii_case(&log.address)
                            && log_cfg.topics[0].eq_ignore_ascii_case(log.topics[0].as_str())
                    })
                })
            };

            manifest
                .get_tx_configs_with_log_configs()
                .iter()
                .enumerate()
                .filter(|(_, (tx_cfg, log_cfgs))| {
                    is_in_chain(tx_cfg) && all_log_configs_match(log_cfgs)
                })
                .map(|(idx, _)| idx as i32)
                .collect()
        }
    }
}

pub mod transactions {
    use serde::{Deserialize, Serialize};
    use web3::types::{Bytes, U256};

    #[derive(Deserialize, Serialize, Clone, Debug, PartialEq)]
    pub struct IngestTransaction {
        #[serde(rename = "blockNumber")]
        pub block_number: u64,
        #[serde(rename = "blockHash")]
        pub block_hash: String,
        #[serde(rename = "transactionIndex")]
        pub transaction_index: u64,
        #[serde(rename = "transactionHash")]
        pub transaction_hash: String,
        pub from: String,
        pub to: String,
        pub value: String,
        pub logs: Vec<IngestLog>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
    pub struct IngestLog {
        pub address: String,
        pub topics: Vec<String>,
        pub data: Bytes,
        #[serde(rename = "logIndex")]
        pub log_index: Option<U256>,
        pub removed: Option<bool>,
    }
}
