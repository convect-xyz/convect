use std::env;

use lambda_runtime::tower::BoxError;
use redis::{cluster::ClusterClient, Commands, Connection, JsonCommands};
use serde::{Deserialize, Serialize};

pub struct Config {
    pub handler_id: String,
    pub project_id: String,
    pub start_block: u64,
    pub end_block: u64,
    pub function_name: String,
    pub tx_queue_url: String,
}

pub fn load_config_from_env() -> Config {
    return Config {
        handler_id: env::var("HANDLER_ID").expect("Handler ID not set"),
        project_id: env::var("PROJECT_ID").expect("Project ID not set"),
        start_block: env::var("START_BLOCK")
            .expect("START_BLOCK is not present")
            .parse()
            .expect("START_BLOCK is not a u64"),
        end_block: env::var("END_BLOCK")
            .expect("END_BLOCK is not present")
            .parse()
            .expect("END_BLOCK is not a u64"),
        function_name: env::var("LOG_FETCHER_LAMBDA_ARN")
            .expect("LOG_FETCHER_LAMBDA_ARN is not present"),
        tx_queue_url: env::var("TRANSACTION_QUEUE_URL")
            .expect("TRANSACTION_QUEUE_URL is not present"),
    };
}

#[derive(Serialize, Deserialize, Clone, PartialEq)]
pub enum SyncState {
    IDLE,
    SYNCING,
    FAILED,
}

impl SyncState {
    fn as_str(&self) -> &'static str {
        match self {
            SyncState::IDLE => "IDLE",
            SyncState::SYNCING => "SYNCING",
            SyncState::FAILED => "FAILED",
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
struct Inner {
    #[serde(rename(serialize = "HandlerId_", deserialize = "HandlerId_"))]
    handler_id: String,
    #[serde(rename(serialize = "State_", deserialize = "State_"))]
    state: SyncState,
    #[serde(rename(serialize = "LastBlock_", deserialize = "LastBlock_"))]
    last_block: Option<String>,
}

pub struct Pipeline {
    client: redis::cluster::ClusterClient,
    inner: Inner,
}

impl Pipeline {
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

    pub async fn load(handler_id: String) -> Pipeline {
        let client = ClusterClient::new(vec![
            "rediss://clustercfg.pipeline-state.cyg7zh.memorydb.eu-west-1.amazonaws.com:6379",
        ])
        .unwrap();

        let mut con = client.get_connection().unwrap();

        let result: String = con.json_get(handler_id, "$").unwrap();

        let inner: Vec<Inner> = serde_json::from_str(result.as_str()).unwrap();

        Pipeline {
            client,
            inner: inner.first().unwrap().clone(),
        }
    }

    pub fn update(&self) -> UpdatePipelineFluentBuilder {
        return UpdatePipelineFluentBuilder {
            connection: self.client.get_connection().unwrap(),
            inner: self.inner.clone(),
        };
    }
}

pub struct UpdatePipelineFluentBuilder {
    connection: redis::cluster::ClusterConnection,
    inner: Inner,
}

impl UpdatePipelineFluentBuilder {
    pub fn set_state(mut self, new_state: SyncState) -> Self {
        self.inner.state = new_state;
        self
    }

    pub fn set_last_block(mut self, new_last_block: u64) -> Self {
        self.inner.last_block = Some(new_last_block.to_string());
        self
    }

    pub async fn send(mut self) -> Result<(), BoxError> {
        let _: String = self
            .connection
            .json_set(self.inner.handler_id.to_string(), "$", &self.inner)
            .unwrap();

        Ok(())
    }
}
