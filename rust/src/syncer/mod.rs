use std::env;

use aws_config::BehaviorVersion;
use aws_sdk_s3::primitives::{ByteStream, SdkBody};
use futures::TryFutureExt;
use lambda_runtime::tower::BoxError;
use serde::{Deserialize, Serialize};

pub struct Config {
    pub pipeline_id: String,
    pub start_block: u64,
    pub end_block: u64,
    pub function_name: String,
    pub tx_queue_url: String,
}

pub fn load_config_from_env() -> Config {
    return Config {
        pipeline_id: env::var("PIPELINE_ID").expect("Pipeline ID not set"),
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

#[derive(Serialize, Deserialize)]
pub struct Pipeline {
    pub pipeline_id: String,
    pub state: SyncState,
    pub last_block: u64,
}

impl Pipeline {
    pub async fn load(pipeline_id: String) -> Pipeline {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let s3_client = aws_sdk_s3::Client::new(&config);
        let sync_prefix = format!("syncs/{:?}", pipeline_id);

        let result = s3_client
            .get_object()
            .bucket("ingest-fetch-logs")
            .key(sync_prefix)
            .send()
            .and_then(|r| async move {
                let body = r.body.collect().await.unwrap();

                let data: Pipeline =
                    serde_json::from_slice(Into::<Vec<u8>>::into(body.into_bytes()).as_slice())
                        .unwrap();
                Ok(data)
            })
            .await;

        match result {
            Ok(v) => v,
            Err(_) => Pipeline {
                pipeline_id,
                state: SyncState::IDLE,
                last_block: 0,
            },
        }
    }

    pub fn update(&self) -> UpdatePipelineFluentBuilder {
        return UpdatePipelineFluentBuilder {
            pipeline_id: self.pipeline_id.clone(),
            state: self.state.clone(),
            last_block: self.last_block,
        };
    }
}

pub struct UpdatePipelineFluentBuilder {
    pub pipeline_id: String,
    pub state: SyncState,
    pub last_block: u64,
}

impl UpdatePipelineFluentBuilder {
    pub fn set_state(mut self, new_state: SyncState) -> UpdatePipelineFluentBuilder {
        self.state = new_state;
        self
    }

    pub fn set_last_block(mut self, new_last_block: u64) -> UpdatePipelineFluentBuilder {
        self.last_block = new_last_block;
        self
    }

    pub async fn send(self) -> Result<(), BoxError> {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let s3_client = aws_sdk_s3::Client::new(&config);
        let sync_prefix: String = format!("syncs/{:?}", self.pipeline_id);

        s3_client
            .put_object()
            .bucket("ingest-fetch-logs")
            .key(sync_prefix)
            .body(ByteStream::new(SdkBody::from(
                serde_json::to_vec(&Pipeline {
                    pipeline_id: self.pipeline_id,
                    state: self.state,
                    last_block: self.last_block,
                })
                .unwrap(),
            )))
            .send()
            .await
            .expect("Failed to upload logs");

        Ok(())
    }
}
