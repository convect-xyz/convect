use crate::redis_client::{errors::RedisClientError, RedisClient, RedisClientImpl};
use backoff::{exponential::ExponentialBackoff, SystemClock};

#[derive(Clone)]
pub struct State<T: RedisClient + Send + Sync> {
    redis_client: T,

    deployment_id: String,
    function_id: String,
    chain_id: u64,
    error_tx: Option<String>,
    error_label: Option<String>,
}

impl<T: RedisClient> State<T> {
    pub fn function_id(&self) -> String {
        self.function_id.clone()
    }

    pub fn deployment_id(&self) -> String {
        self.deployment_id.clone()
    }

    pub fn chain_id(&self) -> u64 {
        self.chain_id
    }

    pub fn error_tx(&self) -> Option<String> {
        self.error_tx.clone()
    }

    pub fn error_label(&self) -> Option<String> {
        self.error_label.clone()
    }

    pub fn update(&mut self) -> UpdateStateFluentBuilder<T> {
        UpdateStateFluentBuilder {
            error_tx: self.error_tx.clone(),
            error_label: self.error_label.clone(),
            state: self,
        }
    }
}

impl State<RedisClientImpl> {
    pub async fn load(function_id: String, chain_id: u64, deployment_id: String) -> Self {
        let client = RedisClientImpl::new().await;

        let (error_tx, error_label): (Option<String>, Option<String>) = client
            .mget(vec![
                format!("process-state-{function_id}-{chain_id}-{deployment_id}-error-tx"),
                format!("process-state-{function_id}-{chain_id}-{deployment_id}-error-label"),
            ])
            .await
            .unwrap();

        Self {
            redis_client: client,
            deployment_id,
            function_id,
            chain_id,
            error_tx,
            error_label,
        }
    }
}
pub struct UpdateStateFluentBuilder<'a, T: RedisClient> {
    state: &'a mut State<T>,
    error_tx: Option<String>,
    error_label: Option<String>,
}

impl<'a, T: RedisClient> UpdateStateFluentBuilder<'a, T> {
    pub fn set_error_tx(mut self, error_tx: Option<String>) -> Self {
        self.error_tx = error_tx;
        self
    }

    pub fn set_error_label(mut self, error_label: Option<String>) -> Self {
        self.error_label = error_label;
        self
    }

    pub async fn send(self) -> Result<(), errors::ProcessingStateError> {
        let function_id = &self.state.function_id;
        let chain_id = &self.state.chain_id;
        let deployment_id = &self.state.deployment_id;
        let redis_client = self.state.redis_client.clone();

        backoff::future::retry::<(), RedisClientError, _, _, ExponentialBackoff<SystemClock>>(
            ExponentialBackoff::default(),
            || async {
                redis_client
                    .mset(&[
                        (
                            get_error_tx_key(function_id, chain_id, deployment_id),
                            self.error_tx.clone().unwrap_or_default(),
                        ),
                        (
                            get_error_label_key(function_id, chain_id, deployment_id),
                            self.error_label.clone().unwrap_or_default(),
                        ),
                    ])
                    .await?;

                Ok(())
            },
        )
        .await?;

        self.state.error_label = self.error_label;
        self.state.error_label = self.error_tx;

        Ok(())
    }
}

fn get_error_tx_key(function_id: &str, chain_id: &u64, deployment_id: &str) -> String {
    format!(
        "{function_id}-{chain_id}-{deployment_id}-error-tx",
        function_id = function_id,
        chain_id = chain_id,
        deployment_id = deployment_id
    )
}

fn get_error_label_key(function_id: &str, chain_id: &u64, deployment_id: &str) -> String {
    format!(
        "{function_id}-{chain_id}-{deployment_id}-error-label",
        function_id = function_id,
        chain_id = chain_id,
        deployment_id = deployment_id
    )
}

mod errors {
    use crate::redis_client::errors::RedisClientError;
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum ProcessingStateError {
        #[error("Redis client error: {0}")]
        RedisClient(#[from] RedisClientError),

        #[error("Retry error: {0}")]
        Retry(#[from] backoff::Error<redis::RedisError>),
    }
}
