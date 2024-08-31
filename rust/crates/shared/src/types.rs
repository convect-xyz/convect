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
        #[serde(rename = "batchId")]
        pub batch_id: String,
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

pub mod chains {
    use serde::Deserialize;

    #[derive(Debug, Deserialize, Clone)]
    pub struct ChainConfig {
        #[serde(rename = "chainId")]
        pub chain_id: u64,
        #[serde(rename = "pollingUrl")]
        pub polling_url: String,
        #[serde(rename = "txQueueUrl")]
        pub tx_queue_url: String,
        #[serde(rename = "etherscanApiKey")]
        pub etherscan_api_key: String,
        #[serde(rename = "etherscanLike")]
        pub etherscan_like: String,
    }
}
