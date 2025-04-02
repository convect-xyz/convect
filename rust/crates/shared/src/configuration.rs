use std::sync::Arc;

use crate::s3::{EncryptionConfig, S3};
use async_trait::async_trait;
use config::{AsyncSource, Config, ConfigError};
use futures::lock::Mutex;
use serde::Deserialize;
use tokio::sync::OnceCell;

const REFRESH_INTERVAL_SECS: u64 = 60 * 5; // 5 minutes
const DECRYPTION_PRIVATE_KEY: &str = env!("CONFIG_ENCRYPTION_PRIVATE_KEY");
const DECRYPTION_ALGORITHM: &str = env!("CONFIG_ENCRYPTION_ALGORITHM");
const INFRA_VERSION: &str = env!("INFRA_VERSION");

static REFRESHING_ENVIRONMENT_CONFIG: OnceCell<Arc<RefreshingEnvironmentConfig>> =
    OnceCell::const_new();

#[derive(Debug, Deserialize, Clone)]

pub struct Redis {
    pub url: String,
}

#[derive(Deserialize, Debug, Clone)]
pub enum FetchStrategyType {
    #[serde(rename = "graphql")]
    Graphql,
    #[serde(rename = "jsonrpc")]
    Jsonrpc,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SupportedNetwork {
    pub id: u64,
    pub name: String,
    pub polling_urls: Vec<String>,
    pub ws_url: String,
    pub sns_topic: String,
    pub etherscan_api_key: String,
    pub etherscan_like: String,
    pub fetch_strategy: FetchStrategyType,
}

#[derive(Debug, Deserialize, Clone)]
pub struct EnvironmentConfig {
    pub redis: Redis,
    pub chains: Vec<SupportedNetwork>,
}

impl EnvironmentConfig {
    pub async fn new() -> Result<Self, ConfigError> {
        let aws_config = aws_config::load_from_env().await;
        let s3 = aws_sdk_s3::Client::new(&aws_config);

        Config::builder()
            .add_async_source(S3ConfigSource::new(
                "convect-pzecvtjr9v".to_string(),
                format!("config/{INFRA_VERSION}-config.json"),
                Arc::new(s3),
            ))
            .build()
            .await?
            .try_deserialize()
    }
}

pub struct RefreshingEnvironmentConfig {
    config: Mutex<EnvironmentConfig>,
}

impl RefreshingEnvironmentConfig {
    pub async fn new() -> Arc<Self> {
        REFRESHING_ENVIRONMENT_CONFIG
            .get_or_init(|| async {
                let config = Mutex::new(EnvironmentConfig::new().await.unwrap());
                let refreshing_config = Arc::new(Self { config });
                Self::start_refreshing(refreshing_config.clone());
                refreshing_config.clone()
            })
            .await
            .clone()
    }

    pub async fn get_config(&self) -> EnvironmentConfig {
        let config = self.config.lock().await;
        config.clone()
    }
    fn start_refreshing(refreshing_config: Arc<Self>) {
        tokio::spawn(async move {
            loop {
                match refreshing_config.refresh().await {
                    Ok(_) => {}
                    Err(e) => {
                        tracing::error!("Failed to refresh config: {e}");
                    }
                }
                tokio::time::sleep(std::time::Duration::from_secs(REFRESH_INTERVAL_SECS)).await;
            }
        });
    }

    async fn refresh(&self) -> Result<(), ConfigError> {
        let mut config = self.config.lock().await;
        *config = EnvironmentConfig::new().await?;
        Ok(())
    }
}

#[derive(Debug)]
struct S3ConfigSource {
    bucket: String,
    key: String,
    s3: Arc<dyn S3>,
}

impl S3ConfigSource {
    pub fn new(bucket: String, key: String, s3: Arc<dyn S3>) -> Self {
        S3ConfigSource { bucket, key, s3 }
    }
}

#[async_trait]
impl AsyncSource for S3ConfigSource {
    async fn collect(&self) -> Result<config::Map<String, config::Value>, ConfigError> {
        let result = self
            .s3
            .get_object_encrypted(
                &self.bucket,
                &self.key,
                &EncryptionConfig {
                    key: DECRYPTION_PRIVATE_KEY.to_string(),
                    algorithm: DECRYPTION_ALGORITHM.to_string(),
                },
            )
            .await
            .map_err(|e| ConfigError::Message(format!("Failed to fetch from S3: {}", e)))?;

        let config = Config::builder()
            .add_source(config::File::from_str(&result, config::FileFormat::Json))
            .build()?;

        Ok(config.try_deserialize::<config::Map<String, config::Value>>()?)
    }
}
