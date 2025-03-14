pub mod batch {
    use serde::{Deserialize, Serialize};
    #[derive(Deserialize, Serialize, Clone, Debug, PartialEq)]
    pub struct IngestBatch {
        pub batch_id: String,
        pub chain_id: u64,
        pub transactions: Vec<super::transactions::IngestTransaction>,
    }
}

pub mod transactions {
    use serde::{Deserialize, Serialize};
    use web3::types::{Bytes, U256};

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
