use crate::redis_client::errors::RedisClientError;
use crate::redis_client::{RedisClient, RedisClientImpl};
use lambda_runtime::tower::BoxError;
use serde::{Deserialize, Serialize};
use tokio_retry::Retry;

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub enum SyncState {
    IDLE,
    SYNCING,
    FAILED,
}

pub struct State<T: RedisClient> {
    redis_client: T,
    deployment_id: String,
    function_id: String,
    chain_id: u64,
    state: SyncState,
    last_block: Option<String>,
}

impl<T: RedisClient> State<T> {
    pub fn deployment_id(&self) -> String {
        self.deployment_id.clone()
    }

    pub fn function_id(&self) -> String {
        self.function_id.clone()
    }

    pub fn state(&self) -> SyncState {
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

    pub fn update(&mut self) -> UpdateStateFluentBuilder<T> {
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
        let redis_client = self.redis_client.clone();
        let key = get_transaction_count_key(&self.function_id, &self.chain_id, &self.deployment_id);

        let _: u64 = redis_client.incr(key, tx_count).await?;
        Ok(())
    }

    pub async fn get_transaction_count(&mut self) -> Result<u64, RedisClientError> {
        let redis_client = self.redis_client.clone();
        let key = get_transaction_count_key(&self.function_id, &self.chain_id, &self.deployment_id);

        let count: u64 = redis_client.get(key).await?;
        Ok(count)
    }
}

impl State<RedisClientImpl> {
    pub async fn load(function_id: String, chain_id: u64, deployment_id: String) -> Self {
        let redis_client = RedisClientImpl::new().await;

        let (state, last_block): (Option<String>, Option<String>) = redis_client
            .mget((
                get_state_key(&function_id, &chain_id, &deployment_id),
                get_last_block_key(&function_id, &chain_id, &deployment_id),
            ))
            .await
            .unwrap();

        Self {
            deployment_id: deployment_id.clone(),
            function_id: function_id.clone(),
            chain_id: chain_id.clone(),
            state: match state.as_ref() {
                Some(state) => serde_json::from_str(state.as_str()).unwrap(),
                None => SyncState::IDLE,
            },
            last_block: last_block.clone(),
            redis_client,
        }
    }
}

pub struct UpdateStateFluentBuilder<'a, T: RedisClient> {
    inner: &'a mut State<T>,

    state: SyncState,
    last_block: Option<String>,
}

impl<'a, T: RedisClient> UpdateStateFluentBuilder<'a, T> {
    pub fn set_state(mut self, new_state: SyncState) -> Self {
        self.state = new_state;
        self
    }

    pub fn set_last_block(mut self, new_last_block: u64) -> Self {
        self.last_block = Some(new_last_block.to_string());
        self
    }

    pub async fn send(&mut self) -> Result<(), BoxError> {
        let redis_client = self.inner.redis_client.clone();

        let deployment_id = &self.inner.deployment_id;
        let function_id = &self.inner.function_id;
        let chain_id = &self.inner.chain_id;

        let mut params = vec![(
            get_state_key(function_id, chain_id, deployment_id),
            serde_json::to_string(&self.state).unwrap(),
        )];

        if let Some(last_block) = &self.last_block {
            params.push((
                get_last_block_key(function_id, chain_id, deployment_id),
                last_block.clone(),
            ));
        }

        let retry_strategy = tokio_retry::strategy::ExponentialBackoff::from_millis(15).take(3);
        let func = || async {
            redis_client.mset(&params).await?;
            Ok::<(), RedisClientError>(())
        };
        Retry::spawn(retry_strategy, func).await?;

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
