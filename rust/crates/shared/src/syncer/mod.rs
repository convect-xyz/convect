use crate::{
    enqueuer::TransactionEnqueuer,
    fetcher::TransactionFetcher,
    manifest::{providers::InitBlockProvider, Manifest},
    syncing::State,
    types::transactions::IngestTransaction,
};
use futures::future::join_all;

mod utils;

const BATCH_SIZE: u64 = 3000;

pub struct ChainSyncer<'a> {
    manifest: &'a Manifest,
    enqueuer: &'a dyn TransactionEnqueuer,
    fetcher: &'a dyn TransactionFetcher,
}

impl<'a> ChainSyncer<'a> {
    pub fn new(
        manifest: &'a Manifest,
        enqueuer: &'a dyn TransactionEnqueuer,
        fetcher: &'a dyn TransactionFetcher,
    ) -> Self {
        Self {
            manifest,
            enqueuer,
            fetcher,
        }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn sync(
        &self,
        state: &mut State,
        start_block: u64,
        end_block: u64,
    ) -> Result<(), errors::ChainSyncerError> {
        return Ok(self._sync(state, start_block, end_block).await?);
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn sync_to(
        &self,
        state: &mut State,
        end_block: u64,
    ) -> Result<(), errors::ChainSyncerError> {
        let start_block = state.manifest_min_block(&self.manifest)?;
        return Ok(self._sync(state, start_block, end_block).await?);
    }

    async fn _sync(
        &self,
        state: &mut State,
        start_block: u64,
        end_block: u64,
    ) -> Result<(), errors::ChainSyncerError> {
        let configs = utils::get_block_configs(start_block, end_block, BATCH_SIZE);

        for chunk in configs.chunks(100) {
            let batched_transactions: Vec<Vec<IngestTransaction>> =
                join_all(chunk.iter().map(|range| {
                    self.fetcher.get_transactions_in_range(
                        &self.manifest,
                        range.start_block,
                        range.end_block,
                    )
                }))
                .await
                .into_iter()
                .collect::<Result<Vec<_>, _>>()?;

            self.enqueuer
                .enqueue_transactions(state, &batched_transactions.into_iter().flatten().collect())
                .await?;

            state
                .update()
                .set_last_block(chunk.last().unwrap().end_block)
                .send()
                .await
                .unwrap();
        }

        Ok(())
    }
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum ChainSyncerError {
        #[error("Failed to fetch transactions: {0}")]
        FetchTransactionsError(#[from] crate::fetcher::errors::TransactionFetcherError),
        #[error("Failed to upload transactions: {0}")]
        TransactionEnqueuerError(#[from] crate::enqueuer::errors::TransactionEnqueuerError),
        #[error("Failed to update pipeline: {0}")]
        StateError(#[from] crate::syncing::errors::StateError),
        #[error("Failed to get init block: {0}")]
        InitBlockProviderError(#[from] crate::manifest::providers::InitBlockProviderError),
    }
}
