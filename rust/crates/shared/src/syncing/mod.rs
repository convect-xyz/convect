use std::sync::Arc;

use crate::redis_client::{errors::RedisClientError, ConvectRedisValue};
use crate::redis_client::{IntoOriginalValue, RedisClient};
use serde::{Deserialize, Serialize};
use tokio_retry::Retry;

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub enum BatchSyncState {
    Idle,
    Syncing,
    Failed,
}

#[derive(Debug)]
pub struct State {
    redis_client: Arc<dyn RedisClient>,
    deployment_id: String,
    function_id: String,
    chain_id: u64,
    state: BatchSyncState,
    last_block: Option<String>,
}

impl State {
    pub fn deployment_id(&self) -> String {
        self.deployment_id.clone()
    }

    pub fn function_id(&self) -> String {
        self.function_id.clone()
    }

    pub fn state(&self) -> BatchSyncState {
        self.state.clone()
    }

    pub fn last_block(&self) -> Option<u64> {
        self.last_block.as_ref().and_then(|v| {
            if v.is_empty() {
                return None;
            }

            Some(v.parse::<u64>().unwrap())
        })
    }

    pub fn next_block(&self) -> Option<u64> {
        self.last_block().map(|l| l + 1)
    }

    pub fn has_synced(&self, incoming_block: u64) -> bool {
        self.last_block()
            .map(|last_processed_block: u64| incoming_block <= last_processed_block)
            .unwrap_or(false)
    }

    pub fn is_batch_syncing(&self) -> bool {
        self.state().eq(&BatchSyncState::Syncing)
    }

    pub fn is_batch_idle(&self) -> bool {
        self.state().eq(&BatchSyncState::Idle)
    }

    pub fn update(&mut self) -> UpdateStateFluentBuilder {
        let state = self.state.clone();
        let last_block = self.last_block.clone();

        UpdateStateFluentBuilder {
            inner: self,
            state,
            last_block,
        }
    }

    pub async fn increment_transaction_count(
        &mut self,
        tx_count: usize,
    ) -> Result<(), RedisClientError> {
        let key = get_transaction_count_key(&self.function_id, &self.chain_id, &self.deployment_id);

        let _: i64 = self
            .redis_client
            .incr(key, tx_count.try_into().unwrap())
            .await?
            .into_original_value();

        Ok(())
    }

    pub async fn get_transaction_count(&mut self) -> Result<u64, RedisClientError> {
        let key = get_transaction_count_key(&self.function_id, &self.chain_id, &self.deployment_id);

        let count: i64 = self.redis_client.get(key).await?.into_original_value();

        Ok(count as u64)
    }

    #[tracing::instrument(err, ret)]
    pub async fn load(
        function_id: String,
        chain_id: u64,
        deployment_id: String,
        redis_client: Arc<dyn RedisClient>,
    ) -> Result<Self, errors::StateError> {
        let (state, last_block): (Option<String>, Option<String>) = redis_client
            .mget(vec![
                get_state_key(&function_id, &chain_id, &deployment_id),
                get_last_block_key(&function_id, &chain_id, &deployment_id),
            ])
            .await?
            .into_original_value();

        Ok(Self {
            deployment_id: deployment_id.clone(),
            function_id: function_id.clone(),
            chain_id: chain_id.clone(),
            state: state.map_or_else(
                || BatchSyncState::Idle,
                |state| serde_json::from_str(state.as_str()).unwrap(),
            ),
            last_block: last_block.clone(),
            redis_client,
        })
    }
}

#[derive(Debug)]
pub struct UpdateStateFluentBuilder<'a> {
    inner: &'a mut State,

    state: BatchSyncState,
    last_block: Option<String>,
}

impl<'a> UpdateStateFluentBuilder<'a> {
    pub fn set_state(mut self, new_state: BatchSyncState) -> Self {
        self.state = new_state;
        self
    }

    pub fn set_last_block(mut self, new_last_block: u64) -> Self {
        self.last_block = Some(new_last_block.to_string());
        self
    }

    #[tracing::instrument(err)]
    pub async fn send(&mut self) -> Result<(), errors::StateError> {
        let redis_client = &self.inner.redis_client;

        let deployment_id = &self.inner.deployment_id;
        let function_id = &self.inner.function_id;
        let chain_id = &self.inner.chain_id;

        let mut params = vec![(
            get_state_key(function_id, chain_id, deployment_id),
            ConvectRedisValue::String(serde_json::to_string(&self.state).unwrap()),
        )];

        if let Some(last_block) = &self.last_block {
            params.push((
                get_last_block_key(function_id, chain_id, deployment_id),
                ConvectRedisValue::String(last_block.clone()),
            ));
        }

        Retry::spawn(
            tokio_retry::strategy::ExponentialBackoff::from_millis(15).take(3),
            || async {
                redis_client.mset(&params).await?;
                Ok::<(), RedisClientError>(())
            },
        )
        .await?;

        self.inner.last_block = self.last_block.clone();
        self.inner.state = self.state.clone();

        Ok(())
    }
}

fn get_state_key(function_id: &str, chain_id: &u64, deployment_id: &str) -> String {
    format!(
        "{function_id}-{chain_id}-{deployment_id}-state",
        function_id = function_id,
        chain_id = chain_id,
        deployment_id = deployment_id
    )
}

fn get_last_block_key(function_id: &str, chain_id: &u64, deployment_id: &str) -> String {
    format!(
        "{function_id}-{chain_id}-{deployment_id}-last-block",
        function_id = function_id,
        chain_id = chain_id,
        deployment_id = deployment_id
    )
}

fn get_transaction_count_key(function_id: &str, chain_id: &u64, deployment_id: &str) -> String {
    format!(
        "{function_id}-{chain_id}-{deployment_id}-tx-count",
        function_id = function_id,
        chain_id = chain_id,
        deployment_id = deployment_id
    )
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum StateError {
        #[error("Failed to update pipeline: {0}")]
        RedisClientError(#[from] crate::redis_client::errors::RedisClientError),
    }
}
