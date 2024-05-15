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

    #[derive(Deserialize)]
    pub struct Manifest {
        pub log_configs: Vec<LogConfig>,
    }

    #[derive(Deserialize)]
    pub struct LogConfig {
        pub address: String,
        pub topics: Vec<String>,
    }
}

pub mod pipeline {
    use lambda_runtime::tower::BoxError;
    use redis::{cluster::ClusterClient, Commands, JsonCommands};
    use serde::{Deserialize, Serialize};

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
        connection: redis::cluster::ClusterConnection,
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

        pub fn load(handler_id: String) -> Self {
            let client = ClusterClient::new(vec![
                "rediss://clustercfg.pipeline-state.cyg7zh.memorydb.eu-west-1.amazonaws.com:6379",
            ])
            .unwrap();

            let mut con = client.get_connection().unwrap();

            let result: String = con.json_get(handler_id, "$").unwrap();
            let inner: Vec<Inner> = serde_json::from_str(result.as_str()).unwrap();

            Self {
                connection: con,
                inner: inner.first().unwrap().clone(),
            }
        }

        pub fn update(&mut self) -> UpdatePipelineFluentBuilder {
            return UpdatePipelineFluentBuilder {
                connection: &mut self.connection,
                inner: self.inner.clone(),
            };
        }

        pub fn increment_transaction_count(&mut self, tx_count: usize) {
            let key = format!(
                "tx-count-{handler_id}",
                handler_id = self.inner.handler_id.to_string()
            );

            let _: u64 = self.connection.incr(key, tx_count).unwrap();
        }

        pub fn get_transaction_count(&mut self) -> u64 {
            let key = format!(
                "tx-count-{handler_id}",
                handler_id = self.inner.handler_id.to_string()
            );

            let count: u64 = self.connection.get(key).unwrap();
            count
        }
    }

    pub struct UpdatePipelineFluentBuilder<'a> {
        connection: &'a mut redis::cluster::ClusterConnection,
        inner: Inner,
    }

    impl<'a> UpdatePipelineFluentBuilder<'a> {
        pub fn set_state(mut self, new_state: SyncState) -> Self {
            self.inner.state = new_state;
            self
        }

        pub fn set_last_block(mut self, new_last_block: u64) -> Self {
            self.inner.last_block = Some(new_last_block.to_string());
            self
        }

        pub fn send(self) -> Result<(), BoxError> {
            let _: String =
                self.connection
                    .json_set(self.inner.handler_id.to_string(), "$", &self.inner)?;

            Ok(())
        }
    }
}
