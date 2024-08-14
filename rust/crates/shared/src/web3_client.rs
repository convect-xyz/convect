use aws_sdk_s3::error::BoxError;
use std::{env, str::FromStr};
use web3::{
    transports::Http,
    types::{Filter, Log, H256},
    Web3,
};

pub trait Web3Client {
    fn get_current_block_number(
        &self,
    ) -> impl std::future::Future<Output = Result<u64, BoxError>> + Send;

    fn get_logs(
        &self,
        filter: Filter,
    ) -> impl std::future::Future<Output = Result<Vec<Log>, BoxError>> + Send;

    fn get_transaction_receipt(
        &self,
        tx_hash: String,
    ) -> impl std::future::Future<Output = Result<Option<web3::types::TransactionReceipt>, BoxError>>
           + Send;

    fn get_transaction_by_hash(
        &self,
        tx_hash: String,
    ) -> impl std::future::Future<Output = Result<Option<web3::types::Transaction>, BoxError>> + Send;
}

#[derive(Clone)]
pub struct Web3ClientImpl {
    web3: Web3<Http>,
}

impl Web3ClientImpl {
    pub fn new() -> Self {
        let transport: Http = web3::transports::Http::new(
            env::var("NODE_ENDPOINT")
                .expect("NODE_ENDPOINT is undefined")
                .as_str(),
        )
        .unwrap();
        let web3: Web3<Http> = web3::Web3::new(transport);

        Self { web3 }
    }

    pub fn new_from_endpoint(endpoint: String) -> Self {
        let transport: Http = web3::transports::Http::new(endpoint.as_str()).unwrap();
        let web3: Web3<Http> = web3::Web3::new(transport);

        Self { web3 }
    }
}

impl Web3Client for Web3ClientImpl {
    async fn get_current_block_number(&self) -> Result<u64, BoxError> {
        Ok(self.web3.eth().block_number().await?.as_u64())
    }

    async fn get_logs(&self, filter: Filter) -> Result<Vec<Log>, BoxError> {
        Ok(self.web3.eth().logs(filter).await?)
    }

    async fn get_transaction_receipt(
        &self,
        tx_hash: String,
    ) -> Result<Option<web3::types::TransactionReceipt>, BoxError> {
        Ok(self
            .web3
            .eth()
            .transaction_receipt(H256::from_str(&tx_hash)?)
            .await?)
    }

    async fn get_transaction_by_hash(
        &self,
        tx_hash: String,
    ) -> Result<Option<web3::types::Transaction>, BoxError> {
        Ok(self
            .web3
            .eth()
            .transaction(H256::from_str(&tx_hash)?)
            .await?)
    }
}
