use std::str::FromStr;
use web3::{
    transports::Http,
    types::{Filter, Log, TransactionId, H256},
    Web3,
};

pub trait Web3Client: Sync + Send {
    fn chain_id(&self) -> u64;

    fn get_current_block_number(
        &self,
    ) -> impl std::future::Future<Output = Result<u64, errors::Web3ClientError>> + Send;

    fn get_logs(
        &self,
        filter: Filter,
    ) -> impl std::future::Future<Output = Result<Vec<Log>, errors::Web3ClientError>> + Send;

    fn get_transaction_receipt(
        &self,
        tx_hash: String,
    ) -> impl std::future::Future<
        Output = Result<Option<web3::types::TransactionReceipt>, errors::Web3ClientError>,
    > + Send;

    fn get_transaction_by_hash(
        &self,
        tx_hash: String,
    ) -> impl std::future::Future<
        Output = Result<Option<web3::types::Transaction>, errors::Web3ClientError>,
    > + Send;
}

#[derive(Clone)]
pub struct Web3ClientImpl {
    web3: Web3<Http>,
    chain_id: u64,
}

impl Web3ClientImpl {
    pub fn new(chain_id: u64, endpoint: String) -> Self {
        let transport: Http = web3::transports::Http::new(endpoint.as_str()).unwrap();
        let web3: Web3<Http> = web3::Web3::new(transport);

        Self { web3, chain_id }
    }
}

impl Web3Client for Web3ClientImpl {
    fn chain_id(&self) -> u64 {
        self.chain_id
    }

    async fn get_current_block_number(&self) -> Result<u64, errors::Web3ClientError> {
        Ok(self.web3.eth().block_number().await?.as_u64())
    }

    async fn get_logs(&self, filter: Filter) -> Result<Vec<Log>, errors::Web3ClientError> {
        Ok(self.web3.eth().logs(filter).await?)
    }

    async fn get_transaction_receipt(
        &self,
        tx_hash: String,
    ) -> Result<Option<web3::types::TransactionReceipt>, errors::Web3ClientError> {
        Ok(self
            .web3
            .eth()
            .transaction_receipt(H256::from_str(&tx_hash)?)
            .await?)
    }

    async fn get_transaction_by_hash(
        &self,
        tx_hash: String,
    ) -> Result<Option<web3::types::Transaction>, errors::Web3ClientError> {
        Ok(self
            .web3
            .eth()
            .transaction(TransactionId::Hash(H256::from_str(&tx_hash)?))
            .await?)
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
