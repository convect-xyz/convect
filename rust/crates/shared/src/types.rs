pub mod transactions {
    use serde::{Deserialize, Serialize};
    use web3::types::U256;

    #[derive(Deserialize, Serialize, Clone, Debug, PartialEq)]
    pub struct IngestTransaction {
        #[serde(rename = "blockNumber")]
        pub block_number: u64,
        #[serde(rename = "blockTimestamp")]
        pub block_timestamp: i64,
        #[serde(rename = "blockHash")]
        pub block_hash: String,
        #[serde(rename = "transactionIndex")]
        pub transaction_index: u64,
        #[serde(rename = "transactionHash")]
        pub transaction_hash: String,
        #[serde(rename = "batchId")]
        pub batch_id: String,
        pub from: String,
        pub to: String,
        pub value: String,
        pub logs: Vec<IngestLog>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
    pub struct IngestLog {
        pub address: String,
        pub topics: Vec<String>,
        pub data: String,
        #[serde(rename = "logIndex")]
        pub log_index: Option<U256>,
        pub removed: Option<bool>,
    }
}
