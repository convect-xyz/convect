use std::sync::Arc;

use async_trait::async_trait;
use config::{AsyncSource, Config, ConfigError};
use futures::lock::Mutex;
use serde::Deserialize;

use crate::s3::{EncryptionConfig, S3};

const REFRESH_INTERVAL_SECS: u64 = 60 * 5; // 5 minutes
const DECRYPTION_PRIVATE_KEY: &str = env!("CONFIG_ENCRYPTION_PRIVATE_KEY");
const DECRYPTION_ALGORITHM: &str = env!("CONFIG_ENCRYPTION_ALGORITHM");

#[derive(Debug, Deserialize, Clone)]

pub struct Redis {
    pub url: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct EnvironmentConfig {
    pub redis: Redis,
}

impl EnvironmentConfig {
    pub async fn new() -> Result<Self, ConfigError> {
        let aws_config = aws_config::load_from_env().await;
        let s3 = aws_sdk_s3::Client::new(&aws_config);

        let s = Config::builder()
            .add_async_source(S3ConfigSource::new(
                "my-bucket".to_string(),
                "config.json".to_string(),
                s3,
            ))
            .build()
            .await?;

        s.try_deserialize()
    }
}

pub struct RefreshingEnvironmentConfig {
    config: Mutex<EnvironmentConfig>,
    s3: Arc<dyn S3>,
}

impl RefreshingEnvironmentConfig {
    pub async fn new(s3: Arc<dyn S3>) -> Arc<Self> {
        let config = Mutex::new(EnvironmentConfig::new(s3.clone()).await.unwrap());
        let refreshing_config = Arc::new(Self { config, s3 });
        Self::start_refreshing(refreshing_config.clone());
        refreshing_config.clone()
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
        *config = EnvironmentConfig::new(self.s3.clone()).await?;
        Ok(())
    }

    async fn get_config(&self) -> EnvironmentConfig {
        let config = self.config.lock().await;
        config.clone()
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
