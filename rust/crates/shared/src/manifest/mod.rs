use serde::Deserialize;
use serde_with::serde_as;
use std::{collections::HashMap, env};

mod macros;

#[derive(Deserialize, Debug, Clone)]
pub struct Manifest {
    pub log_configs: Vec<LogConfig>,
    pub tx_configs: Vec<TransactionConfig>,
}

#[serde_as]
#[derive(Deserialize, Debug, Clone, PartialEq)]
pub struct TransactionConfig {
    pub start_block: HashMap<String, u64>,
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

impl Manifest {
    pub async fn from_env() -> Result<Manifest, errors::ManifestFromEnvError> {
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

        serde_json::from_str(&content).map_err(|err| errors::ManifestFromEnvError::from(err))
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

mod errors {
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
}
