use std::sync::Arc;

use crate::redis_client::{IntoOriginalValue as _, RedisClient};

#[derive(Clone)]
pub struct State {
    redis_client: Arc<dyn RedisClient>,
    deployment_id: String,
    function_id: String,
    chain_id: u64,
    error_batch_id: Option<String>,
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

    pub fn error_batch_id(&self) -> Option<String> {
        self.error_batch_id.clone()
    }

    pub fn update(&mut self) -> UpdateStateFluentBuilder {
        UpdateStateFluentBuilder {
            error_batch_id: self.error_batch_id.clone(),
            state: self,
        }
    }

    pub async fn load(
        function_id: String,
        chain_id: u64,
        deployment_id: String,
        redis_client: Arc<dyn RedisClient>,
    ) -> Self {
        let error_batch_id: Option<String> = redis_client
            .get(format!(
                "process-state-{function_id}-{chain_id}-{deployment_id}-error-batch-id"
            ))
            .await
            .unwrap()
            .into_original_value();

        Self {
            redis_client,
            deployment_id,
            function_id,
            chain_id,
            error_batch_id,
        }
    }
}

pub struct UpdateStateFluentBuilder<'a> {
    state: &'a mut State,
    error_batch_id: Option<String>,
}

impl<'a> UpdateStateFluentBuilder<'a> {
    pub fn set_error_batch_id(mut self, batch_id: Option<String>) -> Self {
        self.error_batch_id = batch_id;
        self
    }

    pub async fn send(self) -> Result<(), errors::ProcessingStateError> {
        let function_id = &self.state.function_id;
        let chain_id = &self.state.chain_id;
        let deployment_id = &self.state.deployment_id;
        let redis_client = &self.state.redis_client;

        redis_client
            .mset(&[(
                get_error_batch_id_key(function_id, chain_id, deployment_id),
                self.error_batch_id.clone().unwrap_or_default().into(),
            )])
            .await?;

        self.state.error_batch_id = self.error_batch_id;

        Ok(())
    }
}

fn get_error_batch_id_key(function_id: &str, chain_id: &u64, deployment_id: &str) -> String {
    format!(
        "{function_id}-{chain_id}-{deployment_id}-error-tx",
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
