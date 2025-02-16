use futures::Future;
use std::cmp::Ordering;
use tokio_retry::strategy::{jitter, ExponentialBackoff};
use tokio_retry::Retry;

use crate::manifest::Manifest;
use crate::types::transactions::IngestTransaction;
use crate::web3_client::Web3Client;

mod utils;

pub trait TransactionFetcher {
    fn chain_id(&self) -> u64;

    fn get_transactions_in_range(
        &self,
        manifest: &Manifest,
        start_block: u64,
        end_block: u64,
    ) -> impl Future<Output = Result<Vec<IngestTransaction>, errors::TransactionFetcherError>>;
}

pub struct TransactionFetcherImpl<T: Web3Client> {
    web3_client: T,
}

impl<T: Web3Client> TransactionFetcherImpl<T> {
    pub fn new(web3_client: T) -> Self {
        Self { web3_client }
    }
}

impl<T: Web3Client> TransactionFetcher for TransactionFetcherImpl<T> {
    fn chain_id(&self) -> u64 {
        self.web3_client.chain_id()
    }

    #[tracing::instrument(skip_all, err)]
    async fn get_transactions_in_range(
        &self,
        manifest: &Manifest,
        range_start: u64,
        range_end: u64,
    ) -> Result<Vec<IngestTransaction>, errors::TransactionFetcherError> {
        let chain_id = self.chain_id();

        let eligible_tx_cfgs: Vec<_> =
            utils::get_eligible_tx_configs(manifest, chain_id, range_start);

        let filter =
            utils::get_web3_client_filter(&eligible_tx_cfgs, chain_id, range_start, range_end);

        println!(
            "[{:?}] Fetching logs with filter {:?}",
            self.web3_client.chain_id(),
            filter.clone(),
        );

        let fetched_logs = Retry::spawn(
            ExponentialBackoff::from_millis(15).map(jitter).take(3),
            || async {
                println!("[{:?}] Fetching logs", self.web3_client.chain_id());
                Ok::<_, errors::TransactionFetcherError>(
                    self.web3_client.get_logs(filter.clone()).await?,
                )
            },
        )
        .await?;

        println!(
            "[{:?}] Fetched {} logs",
            self.web3_client.chain_id(),
            fetched_logs.len()
        );

        let mut txs = utils::group_logs_into_transactions(utils::remove_extranous_logs(
            manifest,
            chain_id,
            fetched_logs,
        ));

        println!(
            "[{:?}] Txs after filtering: {:?}",
            self.web3_client.chain_id(),
            txs
        );

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
        Web3ClientError(#[from] crate::web3_client::errors::Web3ClientError),
    }
}

#[cfg(test)]
mod tests {
    use web3::types::{Filter, Log};

    use super::*;
    use crate::manifest::Manifest;
    use crate::types::transactions::IngestTransaction;
    use crate::web3_client::Web3Client;
    use std::collections::HashMap;

    #[derive(Clone)]
    struct MockWeb3Client {
        logs: Vec<Log>,
    }

    impl MockWeb3Client {
        fn new(logs: Vec<Log>) -> Self {
            Self { logs }
        }
    }

    impl Web3Client for MockWeb3Client {
        fn chain_id(&self) -> u64 {
            1
        }

        async fn get_logs(
            &self,
            _filter: Filter,
        ) -> Result<Vec<Log>, crate::web3_client::errors::Web3ClientError> {
            Ok(self.logs.clone())
        }

        async fn get_current_block_number(
            &self,
        ) -> Result<u64, crate::web3_client::errors::Web3ClientError> {
            todo!()
        }

        async fn get_transaction_receipt(
            &self,
            _tx_hash: String,
        ) -> Result<
            Option<web3::types::TransactionReceipt>,
            crate::web3_client::errors::Web3ClientError,
        > {
            todo!()
        }

        async fn get_transaction_by_hash(
            &self,
            _tx_hash: String,
        ) -> Result<Option<web3::types::Transaction>, crate::web3_client::errors::Web3ClientError>
        {
            todo!()
        }
    }

    // mod get_transactions_in_range {
    //     use crate::{
    //         build_log, build_log_config, manifest::TransactionConfig,
    //         types::transactions::IngestLog,
    //     };

    //     use super::*;

    //     #[tokio::test]
    //     async fn test_gets_transactions_in_range() {
    //         // Arrange.
    //         let manifest = Manifest {
    //             tx_configs: vec![
    //                 TransactionConfig {
    //                     chains: vec![1].into(),
    //                     start_block: HashMap::from([("1".to_string(), 150)]),
    //                 },
    //                 TransactionConfig {
    //                     chains: vec![1].into(),
    //                     start_block: HashMap::from([("1".to_string(), 180)]),
    //                 },
    //                 TransactionConfig {
    //                     chains: vec![1].into(),
    //                     start_block: HashMap::from([("1".to_string(), 5)]),
    //                 },
    //             ],
    //             log_configs: vec![
    //                 build_log_config! {
    //                     address = "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002",
    //                     topics = vec!["0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62".to_string()],
    //                     tx_configs = vec![0]
    //                 },
    //                 build_log_config! {
    //                     address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
    //                     topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33".to_string()],
    //                     tx_configs = vec![1]
    //                 },
    //                 build_log_config! {
    //                     address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
    //                     topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33".to_string()],
    //                     tx_configs = vec![2]
    //                 },
    //             ],
    //         };

    //         // Act.
    //         let fetcher = TransactionFetcherImpl::new(MockWeb3Client::new(vec![
    //             build_log! {
    //                 address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
    //                 block_number = 150,
    //                 data = "0x0000000000000000000000000000000000000000000000000000000000000000",
    //                 log_index = 0,
    //                 topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33"],
    //                 transaction_hash = "0x0000000000000000000000000000000000000000000000000000000000000000",
    //                 transaction_index = 0,
    //             },
    //             build_log! {
    //                 address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
    //                 block_number = 150,
    //                 data = "0x0000000000000000000000000000000000000000000000000000000000000000",
    //                 log_index = 1,
    //                 topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33"],
    //                 transaction_hash = "0x0000000000000000000000000000000000000000000000000000000000000000",
    //                 transaction_index = 0,
    //             },
    //             build_log! {
    //                 address = "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002",
    //                 block_number = 180,
    //                 data = "0x0000000000000000000000000000000000000000000000000000000000000000",
    //                 log_index = 0,
    //                 topics = vec!["0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62"],
    //                 transaction_hash = "0x0000000000000000000000000000000000000000000000000000000000000000",
    //                 transaction_index = 0,
    //             },
    //         ]));

    //         let txs = fetcher
    //             .get_transactions_in_range(&manifest, 0, 1000000)
    //             .await
    //             .unwrap();

    //         // Assert.
    //         assert_eq!(
    //             txs,
    //             vec![
    //                 IngestTransaction {
    //                     block_number: 150,
    //                     block_hash: "0000000000000000000000000000000000000000000000000000000000000000".to_string(),
    //                     transaction_index: 0,
    //                     batch_id: "0".to_string(),
    //                     transaction_hash: "0000000000000000000000000000000000000000000000000000000000000000".to_string(),
    //                     logs: vec![
    //                         IngestLog {
    //                             address: "0x8d9088383506437d8De8897B5cF924a2ac70BBDb".to_string(),
    //                             topics: vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33".to_string()],
    //                             data: "0x0000000000000000000000000000000000000000000000000000000000000000".into(),
    //                             log_index: Some(0.into()),
    //                             removed: Some(false),
    //                         },
    //                         IngestLog {
    //                             address: "0x8d9088383506437d8De8897B5cF924a2ac70BBDb".to_string(),
    //                             topics: vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33".to_string()],
    //                             data: "0x0000000000000000000000000000000000000000000000000000000000000000".into(),
    //                             log_index: Some(1.into()),
    //                             removed: Some(false),
    //                         },
    //                     ],
    //                 },
    //                 IngestTransaction {
    //                     block_number: 180,
    //                     block_hash: "0000000000000000000000000000000000000000000000000000000000000000".to_string(),
    //                     transaction_index: 0,
    //                     batch_id: "0".to_string(),
    //                     transaction_hash: "0000000000000000000000000000000000000000000000000000000000000000".to_string(),
    //                     logs: vec![
    //                         IngestLog {
    //                             address: "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002".to_string(),
    //                             topics: vec!["0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62".to_string()],
    //                             data: "0x0000000000000000000000000000000000000000000000000000000000000000".into(),
    //                             log_index: Some(0.into()),
    //                             removed: Some(false),
    //                         },
    //                     ],
    //                 },
    //             ]
    //         );
    //     }
    // }
}
