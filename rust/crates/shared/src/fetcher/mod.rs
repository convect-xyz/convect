use crate::manifest::Manifest;
use crate::types::transactions::IngestTransaction;
use async_trait::async_trait;
use std::cmp::Ordering;
use strategy::utils::get_strategy_for_chain_id;
use strategy::FetchStrategy;

pub mod graphql;
mod strategy;
mod utils;
pub mod web3;

#[async_trait]
pub trait TransactionFetcher {
    fn chain_id(&self) -> u64;

    async fn get_transactions_in_range(
        &self,
        manifest: &Manifest,
        start_block: u64,
        end_block: u64,
    ) -> Result<Vec<IngestTransaction>, errors::TransactionFetcherError>;
}

pub struct TransactionFetcherImpl {
    strategy: Box<dyn FetchStrategy>,
    chain_id: u64,
}

impl TransactionFetcherImpl {
    pub fn with_defaults(chain_id: u64) -> Self {
        Self {
            strategy: get_strategy_for_chain_id(chain_id),
            chain_id,
        }
    }
}

#[async_trait]
impl TransactionFetcher for TransactionFetcherImpl {
    fn chain_id(&self) -> u64 {
        self.chain_id
    }

    #[tracing::instrument(skip_all, err)]
    async fn get_transactions_in_range(
        &self,
        manifest: &Manifest,
        range_start: u64,
        range_end: u64,
    ) -> Result<Vec<IngestTransaction>, errors::TransactionFetcherError> {
        let results = self
            .strategy
            .get_log_results_in_range(manifest, range_start, range_end)
            .await?;

        let mut txs = utils::group_logs_into_transactions(utils::remove_extranous_logs(
            manifest,
            self.chain_id,
            results,
        ));

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

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum TransactionFetcherError {
        #[error("Failed to upload transactions: {0}")]
        Web3ClientError(#[from] super::web3::client::errors::Web3ClientError),
        #[error("Graphql error: {0}")]
        GraphqlError(#[from] super::graphql::client::errors::GethGraphqlClientError),
        #[error("Failed to fetch transactions: {0}")]
        FetchStrategyError(#[from] super::strategy::errors::FetchStrategyError),
    }
}
