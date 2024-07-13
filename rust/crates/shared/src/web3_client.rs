use aws_sdk_s3::error::BoxError;
use std::env;
use web3::{
    transports::Http,
    types::{Filter, Log},
    Web3,
};

pub trait Web3Client {
    fn get_logs(
        &self,
        filter: Filter,
    ) -> impl std::future::Future<Output = Result<Vec<Log>, BoxError>> + Send;
}

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
}

impl Web3Client for Web3ClientImpl {
    async fn get_logs(&self, filter: Filter) -> Result<Vec<Log>, BoxError> {
        Ok(self.web3.eth().logs(filter).await?)
    }
}
