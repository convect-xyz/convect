use std::sync::Arc;

use crate::redis_client::{errors::RedisClientError, IntoOriginalValue as _, RedisClient};
use backoff::{exponential::ExponentialBackoff, SystemClock};

#[derive(Clone)]
pub struct State {
    redis_client: Arc<dyn RedisClient>,
    deployment_id: String,
    function_id: String,
    chain_id: u64,
    error_tx: Option<String>,
    error_label: Option<String>,
}

impl State {
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

    pub fn update(&mut self) -> UpdateStateFluentBuilder {
        UpdateStateFluentBuilder {
            error_tx: self.error_tx.clone(),
            error_label: self.error_label.clone(),
            state: self,
        }
    }

    pub async fn load(
        function_id: String,
        chain_id: u64,
        deployment_id: String,
        redis_client: Arc<dyn RedisClient>,
    ) -> Self {
        let (error_tx, error_label): (Option<String>, Option<String>) = redis_client
            .mget(vec![
                format!("process-state-{function_id}-{chain_id}-{deployment_id}-error-tx"),
                format!("process-state-{function_id}-{chain_id}-{deployment_id}-error-label"),
            ])
            .await
            .unwrap()
            .into_original_value();

        Self {
            redis_client,
            deployment_id,
            function_id,
            chain_id,
            error_tx,
            error_label,
        }
    }
}

pub struct UpdateStateFluentBuilder<'a> {
    state: &'a mut State,
    error_tx: Option<String>,
    error_label: Option<String>,
}

impl<'a> UpdateStateFluentBuilder<'a> {
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
        let redis_client = &self.state.redis_client;

        backoff::future::retry::<(), RedisClientError, _, _, ExponentialBackoff<SystemClock>>(
            ExponentialBackoff::default(),
            || async {
                redis_client
                    .mset(&[
                        (
                            get_error_tx_key(function_id, chain_id, deployment_id),
                            self.error_tx.clone().unwrap_or_default().into(),
                        ),
                        (
                            get_error_label_key(function_id, chain_id, deployment_id),
                            self.error_label.clone().unwrap_or_default().into(),
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
