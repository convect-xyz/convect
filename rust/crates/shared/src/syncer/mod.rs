use crate::{
    enqueuer::{TransactionEnqueuer, UploadMethod},
    fetcher::TransactionFetcher,
    manifest::Manifest,
    syncing::State,
    types::{batch::IngestBatchTransaction, transactions::IngestTransaction},
};
use futures::future::join_all;

mod utils;

const BATCH_SIZE: u64 = 500;

#[derive(Debug, Clone)]
struct TransactionBufferEntry {
    transactions: Vec<IngestBatchTransaction>,
    byte_size: usize,
    upload_method: UploadMethod,
}

impl TransactionBufferEntry {
    fn is_full(&self) -> bool {
        self.transactions.len() >= 60 || self.byte_size >= 220000
    }

    fn is_at_raw_upload_byte_capacity(&self) -> bool {
        self.byte_size >= 220000
    }

    fn is_at_transaction_capacity(&self) -> bool {
        self.transactions.len() >= 60
    }
}

struct TransactionBuffer {
    entry: Option<TransactionBufferEntry>,
}

impl TransactionBuffer {
    pub fn new() -> Self {
        Self { entry: None }
    }

    fn add_transaction(&mut self, tx: IngestBatchTransaction) -> Option<TransactionBufferEntry> {
        let tx_byte_size = serde_json::to_string(&tx).unwrap().len();

        let is_at_capacity = self
            .entry
            .as_ref()
            .is_some_and(|e| e.is_at_transaction_capacity());

        if is_at_capacity {
            let upload_method = if tx_byte_size > 220000 {
                UploadMethod::S3
            } else {
                UploadMethod::Raw
            };

            let new_entry = TransactionBufferEntry {
                transactions: vec![tx],
                byte_size: tx_byte_size,
                upload_method,
            };

            let old_entry = self.entry.replace(new_entry);

            return old_entry;
        }

        let current_entry = self.entry.get_or_insert(TransactionBufferEntry {
            transactions: Vec::new(),
            byte_size: 0,
            upload_method: UploadMethod::Raw,
        });

        let new_entry_byte_size = current_entry.byte_size + tx_byte_size;
        if new_entry_byte_size > 220000 {
            current_entry.upload_method = UploadMethod::S3;
        }

        current_entry.transactions.push(tx);
        current_entry.byte_size += tx_byte_size;

        return None;
    }

    fn drain(&mut self) -> Option<TransactionBufferEntry> {
        self.entry.take()
    }
}

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
        let mut buffer = TransactionBuffer::new();

        for chunk in configs.chunks(100) {
            let transactions: Vec<IngestTransaction> = join_all(chunk.iter().map(|range| {
                self.fetcher.get_transactions_in_range(
                    &self.manifest,
                    range.start_block,
                    range.end_block,
                )
            }))
            .await
            .into_iter()
            .collect::<Result<Vec<_>, _>>()?
            .into_iter()
            .flatten()
            .collect();

            for tx in transactions.into_iter() {
                let maybe_buffer_entry = buffer.add_transaction(
                    IngestBatchTransaction::from_transaction(&self.manifest, state.chain_id(), tx),
                );

                if let Some(buffer_entry) = maybe_buffer_entry {
                    self.enqueuer
                        .enqueue_transactions(
                            state,
                            buffer_entry.transactions,
                            buffer_entry.upload_method,
                        )
                        .await?;
                }
            }

            state
                .update()
                .set_last_block(chunk.last().unwrap().end_block)
                .send()
                .await?;
        }

        // Drain the buffer.
        if let Some(buffer_entry) = buffer.drain() {
            self.enqueuer
                .enqueue_transactions(state, buffer_entry.transactions, buffer_entry.upload_method)
                .await?;
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
