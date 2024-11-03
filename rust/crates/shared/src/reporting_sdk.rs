use std::env;

use async_trait::async_trait;
use aws_config::BehaviorVersion;
use aws_sdk_s3::error::BoxError;
use aws_smithy_types::body::SdkBody;
use aws_smithy_types::byte_stream::ByteStream;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TransactionResultLabel {
    pub label: String,
    pub timestamp_ms: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TransactionResult {
    pub transaction_hash: String,
    pub batch_id: String,
    pub successful_labels: Vec<TransactionResultLabel>,
    pub failed_label: Option<TransactionResultLabel>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Metric {
    pub duration_ms: f64,
    pub billed_duration_ms: u64,
    pub memory_size_mb: u64,
    pub max_memory_used_mb: u64,
    pub init_duration_ms: Option<f64>,
    pub restore_duration_ms: Option<f64>,
}

#[derive(Serialize, Deserialize)]
pub enum Request {
    Results {
        function_id: String,
        chain_id: String,
        project_id: i32,
        invocation_id: String,
        results: Vec<TransactionResult>,
        deployment_id: String,
    },
    Metrics {
        function_id: String,
        chain_id: String,
        project_id: i32,
        metrics: Vec<Metric>,
        deployment_id: String,
    },
}

impl Request {
    pub async fn from_written_request(written_request: WrittenRequest) -> Request {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let s3_client = aws_sdk_s3::Client::new(&config);

        let object = s3_client
            .get_object()
            .bucket(&written_request.bucket)
            .key(&written_request.key)
            .send()
            .await
            .unwrap();

        let data = object.body.collect().await.unwrap();
        let content = String::from_utf8(data.into_bytes().to_vec()).unwrap();
        serde_json::from_str(&content).unwrap()
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WrittenRequest {
    pub bucket: String,
    pub key: String,
}

impl WrittenRequest {
    pub async fn delete(&self) {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let s3_client = aws_sdk_s3::Client::new(&config);

        s3_client
            .delete_object()
            .bucket(&self.bucket)
            .key(&self.key)
            .send()
            .await
            .unwrap();
    }
}

#[async_trait]
pub trait ReportingSdk {
    async fn handle(&self, request: &Request) -> Result<(), BoxError>;
}

#[derive(Clone)]
pub struct SQSReportingSdk {
    queue_url: String,
}

impl SQSReportingSdk {
    pub fn new() -> Self {
        SQSReportingSdk {
            queue_url: env::var("REPORTING_QUEUE_URL").expect("REPORTING_QUEUE_URL must be set"),
        }
    }
}

#[async_trait]
impl ReportingSdk for SQSReportingSdk {
    async fn handle(&self, request: &Request) -> Result<(), BoxError> {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let s3_client = aws_sdk_s3::Client::new(&config);

        let bucket = String::from("ingest-fetch-logs");
        let key = format!("convect-results/{}.json", format!("{}", Uuid::new_v4()));
        s3_client
            .put_object()
            .bucket(bucket)
            .key(key)
            .body(ByteStream::new(SdkBody::from(
                serde_json::to_string(request).unwrap(),
            )))
            .send()
            .await?;

        let sqs_client = aws_sdk_sqs::Client::new(&config);

        sqs_client
            .send_message()
            .message_body(serde_json::to_string(&WrittenRequest { bucket, key }).unwrap())
            .queue_url(&self.queue_url)
            .send()
            .await?;

        Ok(())
    }
}
