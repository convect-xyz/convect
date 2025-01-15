use serde::Deserialize;
use serde_with::serde_as;
use std::{collections::HashMap, env};

mod macros;

#[serde_as]
#[derive(Deserialize, Debug, Clone, PartialEq)]
pub struct TransactionConfig {
    pub start_block: HashMap<String, u64>,
    pub chains: Option<Vec<i64>>,
}

impl TransactionConfig {
    pub fn get_start_block(&self, chain_id: u64) -> Option<u64> {
        self.start_block.get(&chain_id.to_string()).cloned()
    }
}

#[derive(Deserialize, Debug, Clone, PartialEq)]
#[serde(untagged)]
pub enum LogOrigin {
    String(String),
    Map(HashMap<String, String>),
}

impl Default for LogOrigin {
    fn default() -> Self {
        LogOrigin::String("0x0000000000000000000000000000000000000000".to_string())
    }
}

impl LogOrigin {
    pub fn get_address(&self, chain_id: u64) -> String {
        match self {
            LogOrigin::String(address) => address.clone(),
            LogOrigin::Map(map) => map.get(&chain_id.to_string()).unwrap().clone(),
        }
    }
}

#[derive(Deserialize, Clone, Debug, Default, PartialEq)]
pub struct LogConfig {
    pub address: LogOrigin,
    pub topics: Vec<String>,
    pub tx_configs: Vec<i64>,
}

#[derive(Deserialize, Clone, Debug, Default, PartialEq)]
pub struct ManifestChainConfig {
    #[serde(rename = "chainId")]
    pub chain_id: u64,
}
#[derive(Deserialize, Debug, Clone)]
pub struct Manifest {
    pub chains: Vec<ManifestChainConfig>,
    pub log_configs: Vec<LogConfig>,
    pub tx_configs: Vec<TransactionConfig>,
}

impl Manifest {
    pub async fn from_env() -> Result<Self, errors::ManifestFromEnvError> {
        let config = aws_config::load_from_env().await;
        let s3_client = aws_sdk_s3::Client::new(&config);
        let bucket = env::var("MANIFEST_BUCKET")?;
        let prefix = env::var("MANIFEST_PREFIX")?;
        let object = s3_client
            .get_object()
            .bucket(bucket)
            .key(prefix)
            .send()
            .await?;
        let data = object.body.collect().await?;
        let content = String::from_utf8(data.into_bytes().to_vec())?;

        Ok(serde_json::from_str(&content)?)
    }

    pub async fn from_file(path: &str) -> Result<Self, errors::ManifestFromFileError> {
        let content = tokio::fs::read_to_string(path).await?;
        Ok(serde_json::from_str(&content)?)
    }

    pub fn get_tx_configs_with_log_configs(&self) -> Vec<(TransactionConfig, Vec<LogConfig>)> {
        self.tx_configs
            .clone()
            .into_iter()
            .enumerate()
            .map(|(idx, tx_cfg)| {
                let log_cfgs: Vec<_> = self
                    .log_configs
                    .iter()
                    .filter(|log_cfg| log_cfg.tx_configs.contains(&(idx as i64)))
                    .cloned()
                    .collect();
                (tx_cfg.clone(), log_cfgs)
            })
            .collect()
    }
}

pub mod errors {
    use aws_sdk_s3::error::SdkError;
    use aws_sdk_s3::operation::get_object::GetObjectError;
    use std::env::VarError;
    use std::string::FromUtf8Error;
    use thiserror::Error;

    #[derive(Debug, Error)]
    pub enum ManifestFromEnvError {
        #[error("Var Error: {0}")]
        EnvError(#[from] VarError),
        #[error("Serialization Error: {0}")]
        SerError(#[from] serde_json::Error),
        #[error("S3 Error: {0}")]
        S3Error(#[from] SdkError<GetObjectError>),
        #[error("Byte Stream Error: {0}")]
        ByteStreamError(#[from] aws_smithy_types::byte_stream::error::Error),
        #[error("Invalid UTF-8 in Manifest: {0}")]
        InvalidUtf8(#[from] FromUtf8Error),
    }

    #[derive(Debug, Error)]
    pub enum ManifestFromFileError {
        #[error("File not found")]
        FileNotFound,
        #[error("Serialization Error: {0}")]
        SerError(#[from] serde_json::Error),
        #[error("IO Error: {0}")]
        IoError(#[from] std::io::Error),
    }
}

pub mod providers {
    use async_trait::async_trait;
    use thiserror::Error;

    use crate::contract_info;
    use crate::manifest::Manifest;
    use crate::web3_client::Web3Client;

    #[async_trait]
    pub trait InitBlockProvider: std::marker::Sync {
        async fn get_init_block(&self, manifest: &Manifest) -> Result<u64, InitBlockProviderError>;
    }

    pub struct InitBlockProviderImpl {
        web3_client: Box<dyn Web3Client>,
    }

    impl InitBlockProviderImpl {
        pub fn new(web3_client: Box<dyn Web3Client>) -> Self {
            Self { web3_client }
        }
    }

    #[async_trait]
    impl InitBlockProvider for InitBlockProviderImpl {
        #[tracing::instrument(skip_all, ret, err)]
        async fn get_init_block(&self, manifest: &Manifest) -> Result<u64, InitBlockProviderError> {
            let manifest_min_block = manifest
                .tx_configs
                .iter()
                .filter(|c| {
                    c.chains
                        .as_ref()
                        .is_none_or(|chains| chains.contains(&(self.web3_client.chain_id() as i64)))
                })
                .map(|c| c.get_start_block(self.web3_client.chain_id()))
                .filter(Option::is_some)
                .map(Option::unwrap)
                .min();

            Ok(manifest_min_block.unwrap())
        }
    }

    #[derive(Debug, Error)]
    pub enum InitBlockProviderError {
        #[error("Contract info provider error: {0}")]
        ContractInfoProviderError(
            #[from] contract_info::errors::EtherscanContractInfoProviderError,
        ),
        #[error("Web3 client error: {0}")]
        Web3ClientError(#[from] crate::web3_client::errors::Web3ClientError),
    }
}
