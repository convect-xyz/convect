use async_trait::async_trait;
use tokio_retry::strategy::{jitter, ExponentialBackoff};
use tokio_retry::Retry;

use super::{FetchStrategy, LogResult};
use crate::fetcher::web3::client::errors::Web3ClientError;
use crate::fetcher::web3::client::Web3Client;
use crate::manifest::Manifest;
use crate::manifest::{LogConfig, TransactionConfig};
use std::cmp::max;
use std::collections::HashMap;
use std::str::FromStr;
use web3::types::{Filter, FilterBuilder, H160, H256};

pub struct JsonRpcFetcherImpl<T: Web3Client> {
    web3_client: T,
}

impl<T: Web3Client> JsonRpcFetcherImpl<T> {
    pub fn new(web3_client: T) -> Self {
        Self { web3_client }
    }
}

#[async_trait]
impl<T: Web3Client> FetchStrategy for JsonRpcFetcherImpl<T> {
    #[tracing::instrument(skip_all, err)]
    async fn get_log_results_in_range(
        &self,
        manifest: &Manifest,
        range_start: u64,
        range_end: u64,
    ) -> Result<Vec<LogResult>, super::errors::FetchStrategyError> {
        let chain_id = self.web3_client.chain_id();
        let eligible_tx_cfgs: Vec<_> =
            super::utils::get_eligible_tx_configs(manifest, chain_id, range_start);
        let filter = get_web3_client_filter(&eligible_tx_cfgs, chain_id, range_start, range_end);

        let fetched_logs = Retry::spawn(
            ExponentialBackoff::from_millis(15).map(jitter).take(3),
            || async { Ok::<_, Web3ClientError>(self.web3_client.get_logs(filter.clone()).await?) },
        )
        .await?;

        let mut transaction_hashes = fetched_logs
            .iter()
            .filter_map(|log| {
                log.transaction_hash
                    .clone()
                    .map(|tx_hash| format!("{:#x}", tx_hash).to_lowercase())
            })
            .collect::<Vec<_>>();
        transaction_hashes.sort();
        transaction_hashes.dedup();

        let transaction_receipts = self
            .web3_client
            .get_transactions_by_hashes(transaction_hashes)
            .await?
            .iter()
            .filter_map(|tx| tx.clone())
            .fold(HashMap::new(), |mut acc, tx| {
                let tx_hash = format!("{:#x}", tx.hash).to_lowercase();
                acc.insert(tx_hash, tx.clone());
                acc
            });

        Ok(fetched_logs
            .into_iter()
            .map(|log| {
                let transaction_hash =
                    format!("{:#x}", log.transaction_hash.unwrap()).to_lowercase();
                let transaction = transaction_receipts.get(&transaction_hash).unwrap();
                (transaction.clone(), log)
            })
            .map(|(tx, log)| LogResult::Jsonrpc((tx, log)))
            .collect::<Vec<_>>())
    }
}

/**
  Returns a Filter that covers all the logs that are relevant to the given range.
  The Filter is constructed by:

  * taking all log config addresses and topics that are relevant to the current range.
  * taking the smallest start block of all the tx_configs as the start block that are relevant to the current range.

  After a response is returned from the web3 client, any extraneous logs that are not relevant to the Manifest should be removed with
  the remove_extranous_logs function.
*/
pub fn get_web3_client_filter(
    tx_configs: &Vec<(TransactionConfig, Vec<LogConfig>)>,
    chain_id: u64,
    range_start: u64,
    range_end: u64,
) -> Filter {
    let all_log_configs: Vec<&LogConfig> = tx_configs
        .iter()
        .map(|(_, log_configs)| log_configs)
        .flatten()
        .collect();

    let mut addresses: Vec<H160> = all_log_configs
        .iter()
        .map(|c| H160::from_str(c.address.get_address(chain_id).as_str()).unwrap())
        .collect();
    addresses.sort();
    addresses.dedup();

    let mut topics: Vec<H256> = all_log_configs
        .iter()
        .map(|c| H256::from_str(c.topics[0].as_str()).unwrap())
        .collect();
    topics.sort();
    topics.dedup();

    let smallest_tx_cfg_start_block = tx_configs
        .iter()
        .map(|tx_cfg| tx_cfg.0.get_start_block(chain_id).unwrap_or(0))
        .min()
        .unwrap_or(0);

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

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum TransactionFetcherError {
        #[error("Failed to upload transactions: {0}")]
        Web3ClientError(#[from] crate::fetcher::web3::client::errors::Web3ClientError),
    }
}
