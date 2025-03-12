use super::graphql::client::example_query::ExampleQueryLogs;
use crate::types::transactions::IngestLog;
use std::str::FromStr as _;
use web3::types::U256;

pub mod graphql;
pub mod jsonrpc;
pub mod utils;

pub enum LogResult {
    Jsonrpc((web3::types::Transaction, web3::types::Log)),
    Graphql(ExampleQueryLogs),
}

impl LogResult {
    pub fn transaction_hash(&self) -> String {
        match self {
            LogResult::Jsonrpc((tx, _)) => format!("{:#x}", tx.hash).to_lowercase(),
            LogResult::Graphql(log) => log.transaction.hash.to_lowercase(),
        }
    }

    pub fn block_number(&self) -> u64 {
        match self {
            LogResult::Jsonrpc((_, log)) => log.block_number.unwrap().as_u64(),
            LogResult::Graphql(log) => u64::from_str_radix(
                log.transaction
                    .block
                    .as_ref()
                    .unwrap()
                    .number
                    .strip_prefix("0x")
                    .unwrap(),
                16,
            )
            .unwrap(),
        }
    }

    pub fn block_hash(&self) -> String {
        match self {
            LogResult::Jsonrpc((_, log)) => format!("{:#x}", log.block_hash.unwrap()),
            LogResult::Graphql(log) => log.transaction.block.as_ref().unwrap().hash.clone(),
        }
    }

    pub fn transaction_index(&self) -> u64 {
        match self {
            LogResult::Jsonrpc((_, log)) => log.transaction_index.unwrap().as_u64(),
            LogResult::Graphql(log) => u64::from_str_radix(
                log.transaction
                    .index
                    .clone()
                    .unwrap()
                    .strip_prefix("0x")
                    .unwrap(),
                16,
            )
            .unwrap(),
        }
    }

    pub fn from(&self) -> String {
        match self {
            LogResult::Jsonrpc((tx, _)) => format!("{:#x}", tx.from.unwrap()),
            LogResult::Graphql(log) => log.transaction.from.address.clone(),
        }
    }

    pub fn to(&self) -> String {
        match self {
            LogResult::Jsonrpc((tx, _)) => format!("{:#x}", tx.to.unwrap()),
            LogResult::Graphql(log) => log.transaction.to.as_ref().unwrap().address.clone(),
        }
    }

    pub fn value(&self) -> String {
        match self {
            LogResult::Jsonrpc((transaction, _)) => format!("{:x}", transaction.value),
            LogResult::Graphql(log) => log.transaction.value.to_string(),
        }
    }

    pub fn address(&self) -> String {
        match self {
            LogResult::Jsonrpc((_, log)) => format!("{:#x}", log.address),
            LogResult::Graphql(log) => log.account.address.clone(),
        }
    }

    pub fn topics(&self) -> Vec<String> {
        match self {
            LogResult::Jsonrpc((_, log)) => log
                .topics
                .clone()
                .into_iter()
                .map(|t| format!("{:#x}", t))
                .collect(),
            LogResult::Graphql(log) => log.topics.clone(),
        }
    }

    pub fn into_ingest_log(self) -> IngestLog {
        match self {
            LogResult::Jsonrpc((_, log)) => log.into_ingest_log(),
            LogResult::Graphql(log) => log.into_ingest_log(),
        }
    }
}

trait IntoIngestLog {
    fn into_ingest_log(&self) -> IngestLog;
}

impl IntoIngestLog for ExampleQueryLogs {
    fn into_ingest_log(&self) -> IngestLog {
        println!("{:?}", self.data.clone());
        IngestLog {
            address: self.account.address.clone(),
            topics: self.topics.clone(),
            data: self.data.clone().into(),
            log_index: Some(U256::from_str(self.index.as_str()).unwrap()),
            removed: Some(false),
        }
    }
}

impl IntoIngestLog for web3::types::Log {
    fn into_ingest_log(&self) -> IngestLog {
        IngestLog {
            address: format!("{:#x}", self.address),
            topics: self.topics.iter().map(|t| format!("{:#x}", t)).collect(),
            data: self.data.clone().into(),
            log_index: self.log_index,
            removed: self.removed,
        }
    }
}

#[async_trait::async_trait]
pub trait FetchStrategy: Sync + Send {
    async fn get_log_results_in_range(
        &self,
        manifest: &crate::manifest::Manifest,
        range_start: u64,
        range_end: u64,
    ) -> Result<Vec<LogResult>, errors::FetchStrategyError>;
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum FetchStrategyError {
        #[error("Failed to upload transactions: {0}")]
        Web3ClientError(#[from] crate::fetcher::web3::client::errors::Web3ClientError),
        #[error("Graphql error: {0}")]
        GraphqlError(#[from] crate::fetcher::graphql::client::errors::GethGraphqlClientError),
    }
}
