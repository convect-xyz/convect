use async_trait::async_trait;
use futures::future::join_all;
use std::fmt::Debug;
use std::str::FromStr;
use std::{future::Future, sync::Arc};
use tokio::sync::Mutex;
use tokio_retry::strategy::jitter;
use tokio_retry::Retry;
use web3::{
    transports::{batch::Batch, Http},
    types::{Filter, Log, TransactionId, H256},
    Web3,
};

#[async_trait]
pub trait Web3Client: Sync + Send {
    fn chain_id(&self) -> u64;

    async fn get_current_block_number(&self) -> Result<u64, errors::Web3ClientError>;

    async fn get_logs(&self, filter: Filter) -> Result<Vec<Log>, errors::Web3ClientError>;

    async fn get_logs_batch(
        &self,
        filters: Vec<Filter>,
    ) -> Result<Vec<Log>, errors::Web3ClientError>;

    async fn get_transaction_receipt(
        &self,
        tx_hash: String,
    ) -> Result<Option<web3::types::TransactionReceipt>, errors::Web3ClientError>;

    async fn get_transaction_by_hash(
        &self,
        tx_hash: String,
    ) -> Result<Option<web3::types::Transaction>, errors::Web3ClientError>;

    async fn get_transactions_by_hashes(
        &self,
        tx_hashes: Vec<String>,
    ) -> Result<Vec<Option<web3::types::Transaction>>, errors::Web3ClientError>;
}

#[derive(Clone)]
pub struct Web3ClientImpl {
    chain_id: u64,
    endpoints: Vec<String>,
    endpoint_index: Arc<Mutex<usize>>,
}

impl Web3ClientImpl {
    pub fn new(chain_id: u64, endpoints: Vec<String>) -> Self {
        Self {
            chain_id,
            endpoints,
            endpoint_index: Arc::new(0.into()),
        }
    }

    async fn with_retry<
        R,
        E: Debug,
        T: Future<Output = Result<R, E>>,
        F: FnMut(&Web3<Http>) -> T,
    >(
        &self,
        func: F,
    ) -> Result<R, E> {
        let retry_strategy = tokio_retry::strategy::FixedInterval::from_millis(200)
            .map(jitter)
            .take(usize::MAX);

        let func = Mutex::new(func);

        Retry::spawn(retry_strategy, || async {
            let mut endpoint_index = self.endpoint_index.lock().await;

            let wrapper = || async {
                let transport: Http =
                    web3::transports::Http::new(self.endpoints[endpoint_index.clone()].as_str())
                        .unwrap();
                let web3: Web3<Http> = web3::Web3::new(transport);
                let mut func = func.lock().await;
                Ok::<R, E>(func(&web3).await?)
            };

            wrapper()
                .await
                .inspect_err(|_| *endpoint_index = (*endpoint_index + 1) % self.endpoints.len())
                .inspect_err(|e| {
                    println!("Error: {:?}", e);
                })
        })
        .await
    }

    async fn batch_with_retry<
        R,
        E: Debug,
        T: Future<Output = Result<R, E>>,
        F: Fn(&Web3<Batch<Http>>) -> T,
    >(
        &self,
        func: F,
    ) -> Result<R, E> {
        let retry_strategy = tokio_retry::strategy::FixedInterval::from_millis(200)
            .map(jitter)
            .take(usize::MAX);

        let func = Mutex::new(func);

        Retry::spawn(retry_strategy, || async {
            let mut endpoint_index = self.endpoint_index.lock().await;

            let wrapper = || async {
                let transport = web3::transports::Batch::new(
                    web3::transports::Http::new(self.endpoints[endpoint_index.clone()].as_str())
                        .unwrap(),
                );
                let web3 = web3::Web3::new(transport);
                let func = func.lock().await;
                Ok::<R, E>(func(&web3).await?)
            };

            wrapper()
                .await
                .inspect_err(|_| *endpoint_index = (*endpoint_index + 1) % self.endpoints.len())
                .inspect_err(|e| {
                    println!("Error: {:?}", e);
                })
        })
        .await
    }
}

#[async_trait]
impl Web3Client for Web3ClientImpl {
    fn chain_id(&self) -> u64 {
        self.chain_id
    }

    #[tracing::instrument(skip_all, err)]
    async fn get_current_block_number(&self) -> Result<u64, errors::Web3ClientError> {
        Ok(self
            .with_retry(|web3| web3.eth().block_number())
            .await?
            .as_u64())
    }

    #[tracing::instrument(skip_all, err)]
    async fn get_logs(&self, filter: Filter) -> Result<Vec<Log>, errors::Web3ClientError> {
        Ok(self
            .with_retry(|web3| web3.eth().logs(filter.clone()))
            .await?)
    }

    async fn get_logs_batch(
        &self,
        filters: Vec<Filter>,
    ) -> Result<Vec<Log>, errors::Web3ClientError> {
        let chunks: std::slice::Chunks<'_, Filter> = filters.chunks(300);
        let results = join_all(chunks.into_iter().map(|chunk| {
            self.batch_with_retry(move |web3| {
                let web3 = web3.clone();
                async move {
                    let filters: Vec<_> = chunk
                        .into_iter()
                        .map(|filter| web3.eth().logs(filter.clone()))
                        .collect();

                    web3.transport().submit_batch().await?;

                    let logs = join_all(filters)
                        .await
                        .into_iter()
                        .collect::<Result<Vec<Vec<Log>>, web3::Error>>()?
                        .into_iter()
                        .flatten()
                        .collect();

                    Ok::<Vec<Log>, web3::Error>(logs)
                }
            })
        }))
        .await
        .into_iter()
        .collect::<Result<Vec<_>, _>>()?;

        Ok(results.into_iter().flatten().collect())
    }

    #[tracing::instrument(skip_all, err)]
    async fn get_transaction_receipt(
        &self,
        tx_hash: String,
    ) -> Result<Option<web3::types::TransactionReceipt>, errors::Web3ClientError> {
        let tx_hash = H256::from_str(&tx_hash)?;
        Ok(self
            .with_retry(|web3| web3.eth().transaction_receipt(tx_hash.clone()))
            .await?)
    }

    #[tracing::instrument(skip_all, err)]
    async fn get_transaction_by_hash(
        &self,
        tx_hash: String,
    ) -> Result<Option<web3::types::Transaction>, errors::Web3ClientError> {
        let tx_hash = TransactionId::Hash(H256::from_str(&tx_hash)?);

        Ok(self
            .with_retry(|web3| web3.eth().transaction(tx_hash.clone()))
            .await?)
    }

    async fn get_transactions_by_hashes(
        &self,
        tx_hashes: Vec<String>,
    ) -> Result<Vec<Option<web3::types::Transaction>>, errors::Web3ClientError> {
        let tx_hashes = tx_hashes.clone();

        let chunks = tx_hashes.chunks(300);
        let results = join_all(chunks.into_iter().map(|chunk| {
            self.batch_with_retry(move |web3| {
                let web3 = web3.clone();
                async move {
                    let tx_hashes: Vec<_> = chunk
                        .iter()
                        .map(|tx_hash| TransactionId::Hash(H256::from_str(tx_hash).unwrap()))
                        .collect();

                    let transactions: Vec<_> = tx_hashes
                        .into_iter()
                        .map(|hash| web3.eth().transaction(hash))
                        .collect();

                    web3.transport().submit_batch().await?;

                    let transactions = join_all(transactions).await.into_iter().collect::<Result<
                        Vec<_>,
                        web3::Error,
                    >>(
                    )?;

                    Ok::<Vec<Option<web3::types::Transaction>>, web3::Error>(transactions)
                }
            })
        }))
        .await
        .into_iter()
        .collect::<Result<Vec<_>, _>>()?;

        Ok(results.into_iter().flatten().collect())
    }
}

pub mod errors {
    use rustc_hex::FromHexError;
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum Web3ClientError {
        #[error("Web3 error: {0}")]
        Web3(#[from] web3::Error),
        #[error("From hex error: {0}")]
        FromHex(#[from] FromHexError),
    }
}
