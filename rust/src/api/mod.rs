use crate::{manifest::Manifest, proto::IngestTransaction};
use serde::{Deserialize, Serialize};
use std::{cmp::Ordering, collections::HashMap, fmt::Debug};
use web3::{futures::future::join_all, types::Log};

mod internal;

pub struct GetIngestTransactionsRequest<'a> {
    pub manifest: &'a Manifest,
    pub start_block: u64,
    pub end_block: u64,
}

pub async fn get_ingest_transactions<'a>(
    request: GetIngestTransactionsRequest<'a>,
) -> Result<Vec<IngestTransaction>, web3::Error> {
    let futures = request.manifest.tx_configs.iter().map(|tx_config| {
        internal::get_ingest_transactions(internal::GetTransactionWithLogsRequest {
            start_block: request.start_block,
            end_block: request.end_block,
            tx_config,
        })
    });

    let mut result = join_all(futures)
        .await
        .into_iter()
        .flat_map(|f| f.unwrap().transactions)
        .collect::<Vec<IngestTransaction>>();

    result.sort_by(|a, b| {
        let block_cmp = a.block_number.cmp(&b.block_number);
        if block_cmp == Ordering::Equal {
            return a.transaction_index.cmp(&b.transaction_index);
        }

        return block_cmp;
    });

    Ok(result)
}
