pub mod transactions {
    use serde::{Deserialize, Serialize};
    use web3::types::{Bytes, U256};

    #[derive(Deserialize, Serialize, Clone, Debug)]
    pub struct IngestTransaction {
        #[serde(rename = "blockNumber")]
        pub block_number: u64,
        #[serde(rename = "blockHash")]
        pub block_hash: String,
        #[serde(rename = "transactionIndex")]
        pub transaction_index: u64,
        #[serde(rename = "transactionHash")]
        pub transaction_hash: String,
        #[serde(rename = "batchId")]
        pub batch_id: String,
        pub logs: Vec<IngestLog>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    pub struct IngestLog {
        pub address: String,
        pub topics: Vec<String>,
        pub data: Bytes,
        #[serde(rename = "logIndex")]
        pub log_index: Option<U256>,
        pub removed: Option<bool>,
    }
}

pub mod manifest {
    use serde::Deserialize;
    use serde_with::{serde_as, DisplayFromStr};
    use std::{collections::HashMap, env};

    #[derive(Deserialize, Debug, Clone)]
    pub struct Manifest {
        pub log_configs: Vec<LogConfig>,
        pub tx_configs: Vec<TransactionConfig>,
    }

    #[serde_as]
    #[derive(Deserialize, Debug, Clone)]
    pub struct TransactionConfig {
        #[serde_as(as = "DisplayFromStr")]
        pub start_block: i64,
    }

    #[derive(Deserialize, Debug, Clone)]
    #[serde(untagged)]
    pub enum LogOrigin {
        String(String),
        Map(HashMap<u64, String>),
    }

    #[derive(Deserialize, Clone, Debug)]
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
    }

    mod errors {
        use aws_sdk_s3::{error::SdkError, operation::get_object::GetObjectError};
        use std::{env::VarError, string::FromUtf8Error};

        #[derive(Debug, Clone)]
        pub enum ManifestFromEnvError {
            EnvError(VarError),
            InvalidManifest(String),
            S3Error(String),
        }

        impl From<VarError> for ManifestFromEnvError {
            fn from(e: VarError) -> Self {
                Self::EnvError(e)
            }
        }

        impl From<serde_json::Error> for ManifestFromEnvError {
            fn from(e: serde_json::Error) -> Self {
                Self::InvalidManifest(format!("Invalid manifest: {:?}", e))
            }
        }

        impl From<SdkError<GetObjectError>> for ManifestFromEnvError {
            fn from(e: SdkError<GetObjectError>) -> Self {
                Self::S3Error(format!("S3 Error: {:?}", e))
            }
        }

        impl From<aws_smithy_types::byte_stream::error::Error> for ManifestFromEnvError {
            fn from(e: aws_smithy_types::byte_stream::error::Error) -> Self {
                Self::InvalidManifest(format!("Byte Stream Error: {:?}", e))
            }
        }

        impl From<FromUtf8Error> for ManifestFromEnvError {
            fn from(e: FromUtf8Error) -> Self {
                Self::InvalidManifest(format!("Invalid UTF-8 in Manifest: {:?}", e))
            }
        }
    }
}

pub mod syncing {
    use std::{error::Error, fmt, sync::Mutex};

    use backoff::{exponential::ExponentialBackoff, SystemClock};
    use lambda_runtime::tower::BoxError;
    use once_cell::sync::Lazy;
    use redis::{Commands, RedisError};
    use serde::{Deserialize, Serialize};

    static CONNECTION: Lazy<Mutex<redis::Connection>> = Lazy::new(|| {
        println!("Getting redis connection");
        let client = redis::Client::open("rediss://default:REDACTED@db-redis-nyc3-60846-do-user-17204040-0.e.db.ondigitalocean.com:25061")
                .unwrap();

        Mutex::new(client.get_connection().unwrap())
    });

    #[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
    pub enum SyncState {
        IDLE,
        SYNCING,
        FAILED,
    }

    #[derive(Debug)]
    pub struct LockError;

    impl fmt::Display for LockError {
        fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
            write!(f, "empty block number")
        }
    }

    impl Error for LockError {}

    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct Inner {
        pub deployment_id: String,
        pub function_id: String,
        pub chain_id: String,
        pub state: SyncState,
        pub last_block: Option<String>,
    }

    pub struct State {
        inner: Inner,
    }

    impl State {
        pub fn function_id(&self) -> String {
            self.inner.function_id.clone()
        }

        pub fn state(&self) -> SyncState {
            self.inner.state.clone()
        }

        pub fn last_block(&self) -> Option<u64> {
            self.inner.last_block.as_ref().and_then(|v| {
                if v.is_empty() {
                    return None;
                }

                Some(v.parse::<u64>().unwrap())
            })
        }

        pub fn load(function_id: String, chain_id: String, deployment_id: String) -> Self {
            let mut con = CONNECTION.lock().unwrap();

            let result: Vec<Option<String>> = con
                .mget(vec![
                    format!("{function_id}-{chain_id}-{deployment_id}-state"),
                    format!("{function_id}-{chain_id}-{deployment_id}-last-block"),
                ])
                .unwrap();

            Self {
                inner: Inner {
                    deployment_id: deployment_id.clone(),
                    function_id: function_id.clone(),
                    chain_id: chain_id.clone(),
                    state: match result[0].as_ref() {
                        Some(state) => serde_json::from_str(state.as_str()).unwrap(),
                        None => SyncState::IDLE,
                    },
                    last_block: result[1].clone(),
                },
            }
        }

        pub fn update(&mut self) -> UpdateStateFluentBuilder {
            UpdateStateFluentBuilder {
                temp_inner: self.inner.clone(),
                inner: &mut self.inner,
            }
        }

        pub fn increment_transaction_count(&mut self, tx_count: usize) {
            let mut connection = CONNECTION.lock().unwrap();
            let key = format!(
                "tx-count-{function_id}-{chain_id}-{deployment_id}",
                function_id = &self.inner.function_id,
                chain_id = &self.inner.chain_id,
                deployment_id = &self.inner.deployment_id
            );

            let _: u64 = connection.incr(key, tx_count).unwrap();
        }

        pub fn get_transaction_count(&mut self) -> u64 {
            let mut connection = CONNECTION.lock().unwrap();
            let key = format!(
                "tx-count-{function_id}-{chain_id}-{deployment_id}",
                function_id = &self.inner.function_id,
                chain_id = &self.inner.chain_id,
                deployment_id = &self.inner.deployment_id
            );

            let count: u64 = connection.get(key).unwrap();
            count
        }

        pub fn inner(&self) -> &Inner {
            &self.inner
        }

        pub fn into_inner(self) -> Inner {
            self.inner
        }
    }

    pub struct UpdateStateFluentBuilder<'a> {
        temp_inner: Inner,
        inner: &'a mut Inner,
    }

    impl<'a> UpdateStateFluentBuilder<'a> {
        pub fn set_state(mut self, new_state: SyncState) -> Self {
            self.temp_inner.state = new_state;
            self
        }

        pub fn set_last_block(mut self, new_last_block: u64) -> Self {
            self.temp_inner.last_block = Some(new_last_block.to_string());
            self
        }

        pub fn send(&mut self) -> Result<(), BoxError> {
            let mut connection = CONNECTION.lock().unwrap();
            let deployment_id = &self.inner.deployment_id;
            let function_id = &self.inner.function_id;
            let chain_id = &self.inner.chain_id;

            backoff::retry::<_, ExponentialBackoff<SystemClock>, (), RedisError>(
                ExponentialBackoff::default(),
                || {
                    connection.mset(&[
                        (
                            format!("{function_id}-{chain_id}-{deployment_id}-state"),
                            serde_json::to_string(&self.temp_inner.state).unwrap(),
                        ),
                        (
                            format!("{function_id}-{chain_id}-{deployment_id}-last-block"),
                            self.temp_inner.last_block.clone().unwrap_or_default(),
                        ),
                    ])?;

                    Ok(())
                },
            )?;

            self.inner.last_block = self.temp_inner.last_block.clone();
            self.inner.state = self.temp_inner.state.clone();

            Ok(())
        }
    }
}

pub mod processing {
    use backoff::{exponential::ExponentialBackoff, SystemClock};
    use futures::lock::Mutex;
    use lambda_runtime::tower::BoxError;
    use redis::{AsyncCommands, RedisError};
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct Inner {
        #[serde(rename = "DeploymentId_")]
        pub deployment_id: String,
        #[serde(rename = "FunctionId_")]
        pub function_id: String,
        #[serde(rename = "ChainId_")]
        pub chain_id: String,
        #[serde(rename = "ErrorTx_")]
        pub error_tx: Option<String>,
        #[serde(rename = "ErrorLabel_")]
        pub error_label: Option<String>,
    }

    pub struct State {
        connection: redis::aio::MultiplexedConnection,
        inner: Inner,
    }

    impl State {
        pub fn function_id(&self) -> String {
            self.inner.function_id.clone()
        }

        pub async fn load(function_id: String, chain_id: String, deployment_id: String) -> Self {
            let client = redis::Client::open("rediss://default:REDACTED@db-redis-nyc3-60846-do-user-17204040-0.e.db.ondigitalocean.com:25061").unwrap();

            let mut con = client.get_multiplexed_async_connection().await.unwrap();

            let result: Vec<Option<String>> = con
                .mget(vec![
                    format!("process-state-{function_id}-{chain_id}-{deployment_id}-error-tx"),
                    format!("process-state-{function_id}-{chain_id}-{deployment_id}-error-label"),
                ])
                .await
                .unwrap();

            Self {
                connection: con,
                inner: Inner {
                    deployment_id: deployment_id.clone(),
                    function_id: function_id.clone(),
                    chain_id: chain_id.clone(),
                    error_tx: result[0].clone(),
                    error_label: result[1].clone(),
                },
            }
        }

        pub fn update(&mut self) -> UpdateStateFluentBuilder {
            UpdateStateFluentBuilder {
                connection: &mut self.connection,
                temp_inner: self.inner.clone(),
                inner: &mut self.inner,
            }
        }

        pub fn inner(&self) -> &Inner {
            &self.inner
        }

        pub fn into_inner(self) -> Inner {
            self.inner
        }
    }

    pub struct UpdateStateFluentBuilder<'a> {
        connection: &'a mut redis::aio::MultiplexedConnection,
        temp_inner: Inner,
        inner: &'a mut Inner,
    }

    impl<'a> UpdateStateFluentBuilder<'a> {
        pub fn set_error_tx(mut self, error_tx: Option<String>) -> Self {
            self.temp_inner.error_tx = error_tx;
            self
        }

        pub fn set_error_label(mut self, error_label: Option<String>) -> Self {
            self.temp_inner.error_label = error_label;
            self
        }

        pub async fn send(self) -> Result<(), BoxError> {
            let function_id = self.inner.function_id.to_string();
            let chain_id = self.inner.chain_id.to_string();
            let deployment_id = self.inner.deployment_id.to_string();
            let connection = Mutex::new(self.connection);

            backoff::future::retry::<(), RedisError, _, _, ExponentialBackoff<SystemClock>>(
                ExponentialBackoff::default(),
                || async {
                    connection
                        .lock()
                        .await
                        .mset(&[
                            (
                                format!("process-state-{function_id}-{chain_id}-{deployment_id}-error-tx"),
                                self.temp_inner.error_tx.clone().unwrap_or_default(),
                            ),
                            (
                                format!("process-state-{function_id}-{chain_id}-{deployment_id}-error-label"),
                                self.temp_inner.error_label.clone().unwrap_or_default(),
                            ),
                        ])
                        .await?;

                    Ok(())
                },
            )
            .await?;

            self.inner.error_label = self.temp_inner.error_label;
            self.inner.error_label = self.temp_inner.error_tx;

            Ok(())
        }
    }
}
