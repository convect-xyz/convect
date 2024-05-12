use std::env;

use aws_sdk_dynamodb::types::AttributeValue;
use lambda_runtime::tower::BoxError;
use serde::{Deserialize, Serialize};
use serde_dynamo::aws_sdk_dynamodb_1;

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

#[derive(Serialize, Deserialize)]
pub struct Pipeline {
    #[serde(rename(serialize = "HandlerId_", deserialize = "HandlerId_"))]
    handler_id: String,
    #[serde(rename(serialize = "ProjectId_", deserialize = "ProjectId_"))]
    project_id: String,
    #[serde(rename(serialize = "State_", deserialize = "State_"))]
    state: SyncState,
    #[serde(rename(serialize = "LastBlock_", deserialize = "LastBlock_"))]
    last_block: Option<String>,
}

impl Pipeline {
    pub fn handler_id(&self) -> String {
        self.handler_id.clone()
    }

    pub fn project_id(&self) -> String {
        self.handler_id.clone()
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

    pub async fn load(handler_id: String) -> Pipeline {
        let config = aws_config::load_from_env().await;
        let client = aws_sdk_dynamodb::Client::new(&config);

        let get_item_request = client
            .get_item()
            .table_name("pipeline_state")
            .key("HandlerId_", AttributeValue::S(handler_id.to_string()));

        let get_item_response = get_item_request.send().await.unwrap();

        let item = match get_item_response.item {
            Some(v) => v,
            None => panic!("Could not find pipeline state"),
        };

        let pipeline: Pipeline = aws_sdk_dynamodb_1::from_item(item).unwrap();
        pipeline
    }

    pub fn update(&self) -> UpdatePipelineFluentBuilder {
        return UpdatePipelineFluentBuilder {
            handler_id: self.handler_id.clone(),
            state: self.state.clone(),
            last_block: self.last_block.clone(),
        };
    }
}

pub struct UpdatePipelineFluentBuilder {
    handler_id: String,
    state: SyncState,
    last_block: Option<String>,
}

impl UpdatePipelineFluentBuilder {
    pub fn set_state(mut self, new_state: SyncState) -> UpdatePipelineFluentBuilder {
        self.state = new_state;
        self
    }

    pub fn set_last_block(mut self, new_last_block: u64) -> UpdatePipelineFluentBuilder {
        self.last_block = Some(new_last_block.to_string());
        self
    }

    pub async fn send(self) -> Result<(), BoxError> {
        let config = aws_config::load_from_env().await;
        let client = aws_sdk_dynamodb::Client::new(&config);

        let result = client
            .update_item()
            .table_name("pipeline_state")
            .update_expression("SET State_ = :state, LastBlock_ = :last_block")
            .expression_attribute_values(
                String::from(":state"),
                AttributeValue::S(self.state.as_str().to_string()),
            )
            .expression_attribute_values(
                String::from(":last_block"),
                AttributeValue::S(
                    self.last_block
                        .or(Some("".to_string()))
                        .unwrap()
                        .to_string(),
                ),
            )
            .key("HandlerId_", AttributeValue::S(self.handler_id))
            .send()
            .await;

        match result {
            Ok(_) => {}
            Err(e) => panic!("Could not update: {:?}", e),
        }

        Ok(())
    }
}
