use async_trait::async_trait;
use aws_config::BehaviorVersion;
use aws_sdk_lambda::types::InvocationType;
use aws_sdk_s3::error::BoxError;
use aws_smithy_types::Blob;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
pub struct InvocationRequest {
    pub id: String,
    pub start_block: u64,
    pub end_block: u64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub enum InvocationResponse {
    NoTransactions,
    Transactions {
        s3_bucket: String,
        s3_prefix: String,
        size: usize,
    },
}

#[async_trait]
pub trait LogFetcherSdk {
    async fn handle(&self, request: InvocationRequest) -> Result<InvocationResponse, BoxError>;
}

pub struct LambdaLogFetcherSdk {
    lambda_client: aws_sdk_lambda::Client,
    function_name: String,
}

impl LambdaLogFetcherSdk {
    pub async fn new(function_name: String) -> Self {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let lambda_client = aws_sdk_lambda::Client::new(&config);

        Self {
            lambda_client,
            function_name,
        }
    }

    pub fn new_from_config(function_name: String, config: &aws_config::SdkConfig) -> Self {
        let lambda_client = aws_sdk_lambda::Client::new(config);

        Self {
            lambda_client,
            function_name,
        }
    }
}

#[async_trait]
impl LogFetcherSdk for LambdaLogFetcherSdk {
    async fn handle(&self, request: InvocationRequest) -> Result<InvocationResponse, BoxError> {
        let output = self
            .lambda_client
            .invoke()
            .invocation_type(InvocationType::RequestResponse)
            .function_name(&self.function_name)
            .payload(Blob::new(serde_json::to_vec(&request).unwrap()))
            .send()
            .await?;

        let payload = match output.payload {
            Some(v) => v.into_inner(),
            None => panic!("Blob is empty"),
        };

        let response: InvocationResponse = serde_json::from_slice(&payload)?;

        Ok(response)
    }
}
