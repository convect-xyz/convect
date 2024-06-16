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
    use std::env;

    #[derive(Deserialize)]
    pub struct Manifest {
        pub log_configs: Vec<LogConfig>,
        pub tx_configs: Vec<TransactionConfig>,
    }

    #[serde_as]
    #[derive(Deserialize)]
    pub struct TransactionConfig {
        #[serde_as(as = "DisplayFromStr")]
        pub start_block: i64,
    }

    #[derive(Deserialize)]
    pub struct LogConfig {
        pub address: String,
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
    use std::{error::Error, fmt};

    use backoff::{exponential::ExponentialBackoff, SystemClock};
    use lambda_runtime::tower::BoxError;
    use redis::{Commands, JsonCommands, RedisError};
    use serde::{Deserialize, Serialize};

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
        #[serde(rename(serialize = "HandlerId_", deserialize = "HandlerId_"))]
        pub handler_id: String,
        #[serde(rename(serialize = "HandlerVersion_", deserialize = "HandlerVersion_"))]
        pub handler_version: String,
        #[serde(rename(serialize = "State_", deserialize = "State_"))]
        pub state: SyncState,
        #[serde(rename(serialize = "LastBlock_", deserialize = "LastBlock_"))]
        pub last_block: Option<String>,
    }

    pub struct State {
        connection: redis::Connection,
        inner: Inner,
    }

    impl State {
        pub fn handler_id(&self) -> String {
            self.inner.handler_id.clone()
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

        pub fn load(handler_id: String, handler_version: String) -> Self {
            let client = redis::Client::open("rediss://default:AbeXAAIncDFjNTRiNjgyMmZjNzM0ZGQzOTZmYTQzZTA5ODQ4YjVkM3AxNDY5OTk@stirred-jawfish-46999.upstash.io:6379")
            .unwrap();

            let mut con = client.get_connection().unwrap();
            let result: Option<String> = con
                .json_get(format!("{handler_id}-{handler_version}"), "$")
                .unwrap();

            let inner = match result {
                Some(result) => {
                    let inner: Vec<Inner> = serde_json::from_str(result.as_str()).unwrap();
                    inner
                }
                None => {
                    vec![Inner {
                        handler_id: handler_id.clone(),
                        handler_version: handler_version.clone(),
                        state: SyncState::IDLE,
                        last_block: None,
                    }]
                }
            };

            if let Some(inner) = inner.first() {
                return Self {
                    connection: con,
                    inner: inner.to_owned(),
                };
            }

            Self {
                connection: con,
                inner: Inner {
                    handler_id: handler_id.clone(),
                    handler_version: handler_version.clone(),
                    state: SyncState::IDLE,
                    last_block: None,
                },
            }
        }

        pub fn update(&mut self) -> UpdateStateFluentBuilder {
            UpdateStateFluentBuilder {
                connection: &mut self.connection,
                inner: self.inner.clone(),
            }
        }

        pub fn increment_transaction_count(&mut self, tx_count: usize) {
            let key = format!(
                "tx-count-{handler_id}-{handler_version}",
                handler_id = &self.inner.handler_id,
                handler_version = &self.inner.handler_version
            );

            let _: u64 = self.connection.incr(key, tx_count).unwrap();
        }

        pub fn get_transaction_count(&mut self) -> u64 {
            let key = format!(
                "tx-count-{handler_id}-{handler_version}",
                handler_id = &self.inner.handler_id,
                handler_version = &self.inner.handler_version
            );

            let count: u64 = self.connection.get(key).unwrap();
            count
        }

        pub fn acquire_lock(&mut self) -> Result<(), BoxError> {
            let key = format!(
                "lock-{handler_id}-{handler_version}",
                handler_id = &self.inner.handler_id,
                handler_version = &self.inner.handler_version
            );

            redis::transaction(&mut self.connection, &[key.as_str()], |con, pipe| {
                let old_val: Option<String> = con.get(key.as_str())?;

                if old_val.as_ref().is_some_and(|old_val| old_val.eq("LOCKED")) {
                    return Err(RedisError::from((
                        redis::ErrorKind::ClientError,
                        "Locked",
                        format!("Lock status is {:?}", old_val.clone()),
                    )));
                }

                pipe.set(key.as_str(), "LOCKED").ignore().query(con)
            })?;

            Ok(())
        }

        pub fn release_lock(&mut self) -> Result<(), BoxError> {
            let key = format!(
                "lock-{handler_id}-{handler_version}",
                handler_id = &self.inner.handler_id,
                handler_version = &self.inner.handler_version
            );

            redis::transaction(&mut self.connection, &[key.as_str()], |con, pipe| {
                let old_val: String = con.get(key.as_str())?;

                if old_val.ne("LOCKED") {
                    return Err(RedisError::from((
                        redis::ErrorKind::ClientError,
                        "not locked",
                        format!("not locked"),
                    )));
                }

                pipe.del(key.as_str()).ignore().query(con)
            })?;

            Ok(())
        }

        pub fn inner(&self) -> &Inner {
            &self.inner
        }

        pub fn into_inner(self) -> Inner {
            self.inner
        }
    }

    pub struct UpdateStateFluentBuilder<'a> {
        connection: &'a mut redis::Connection,
        inner: Inner,
    }

    impl<'a> UpdateStateFluentBuilder<'a> {
        pub fn set_state(mut self, new_state: SyncState) -> Self {
            self.inner.state = new_state;
            self
        }

        pub fn set_last_block(mut self, new_last_block: u64) -> Self {
            self.inner.last_block = Some(new_last_block.to_string());
            self
        }

        pub fn send(self) -> Result<(), BoxError> {
            let handler_id = &self.inner.handler_id;
            let handler_version = &self.inner.handler_version;

            backoff::retry::<_, ExponentialBackoff<SystemClock>, (), RedisError>(
                ExponentialBackoff::default(),
                || {
                    self.connection.json_set(
                        format!("{handler_id}-{handler_version}"),
                        "$",
                        &self.inner,
                    )?;

                    Ok(())
                },
            )?;

            Ok(())
        }
    }
}

pub mod processing {
    use backoff::{exponential::ExponentialBackoff, SystemClock};
    use futures::lock::Mutex;
    use lambda_runtime::tower::BoxError;
    use redis::{JsonAsyncCommands, RedisError};
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct Inner {
        #[serde(rename = "HandlerId_")]
        pub handler_id: String,
        #[serde(rename = "HandlerVersion_")]
        pub handler_version: String,
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
        pub fn handler_id(&self) -> String {
            self.inner.handler_id.clone()
        }

        pub async fn load(handler_id: String, handler_version: String) -> Self {
            let client = redis::Client::open("rediss://default:AbeXAAIncDFjNTRiNjgyMmZjNzM0ZGQzOTZmYTQzZTA5ODQ4YjVkM3AxNDY5OTk@stirred-jawfish-46999.upstash.io:6379").unwrap();

            let mut con = client.get_multiplexed_async_connection().await.unwrap();

            let result: Option<String> = con
                .json_get(format!("process-state-{handler_id}-{handler_version}"), "$")
                .await
                .unwrap();

            let inner = match result {
                Some(result) => {
                    let inner: Vec<Inner> = serde_json::from_str(result.as_str()).unwrap();
                    inner
                }
                None => {
                    vec![Inner {
                        handler_id: handler_id.clone(),
                        handler_version: handler_version.clone(),
                        error_tx: None,
                        error_label: None,
                    }]
                }
            };

            if let Some(inner) = inner.first() {
                return Self {
                    connection: con,
                    inner: inner.to_owned(),
                };
            }

            Self {
                connection: con,
                inner: Inner {
                    handler_id: handler_id.clone(),
                    handler_version: handler_version.clone(),
                    error_tx: None,
                    error_label: None,
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
            let handler_id = self.inner.handler_id.to_string();
            let handler_version = self.inner.handler_version.to_string();
            let connection = Mutex::new(self.connection);

            backoff::future::retry::<(), RedisError, _, _, ExponentialBackoff<SystemClock>>(
                ExponentialBackoff::default(),
                || async {
                    connection
                        .lock()
                        .await
                        .json_set(
                            format!("process-state-{handler_id}-{handler_version}"),
                            "$",
                            &self.inner,
                        )
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
