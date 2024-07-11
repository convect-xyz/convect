use aws_sdk_s3::error::BoxError;
use std::env;
use std::str::FromStr;
use web3::{
    transports::Http,
    types::{FilterBuilder, Log, H160, H256},
    Web3,
};

use crate::types::manifest::LogConfig;

pub trait Web3Client {
    fn get_logs_for_config(
        &self,
        configs: Vec<GetLogConfig>,
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

pub struct GetLogConfig {
    pub config: LogConfig,
    pub start_block: u64,
    pub end_block: u64,
}

impl Web3Client for Web3ClientImpl {
    async fn get_logs_for_config(&self, configs: Vec<GetLogConfig>) -> Result<Vec<Log>, BoxError> {
        let addresses = configs
            .iter()
            .map(|c| H160::from_str(c.config.address.as_str()).unwrap())
            .collect();

        let start_block = configs.iter().map(|c| c.start_block).min().unwrap();
        let end_block = configs.iter().map(|c| c.end_block).max().unwrap();

        let topics = configs
            .iter()
            .map(|c| H256::from_str(c.config.topics[0].as_str()).unwrap())
            .collect();

        let filter = FilterBuilder::default()
            .address(addresses)
            .from_block(web3::types::BlockNumber::Number(start_block.into()))
            .to_block(web3::types::BlockNumber::Number(end_block.into()))
            .topics(Some(topics), None, None, None)
            .build();

        let result = self.web3.eth().logs(filter).await?;

        Ok(result)
    }
}
