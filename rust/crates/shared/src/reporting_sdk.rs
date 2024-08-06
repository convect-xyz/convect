use std::env;

use async_trait::async_trait;
use aws_config::BehaviorVersion;
use aws_sdk_s3::error::BoxError;
use serde::{Deserialize, Serialize};

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
        handler_id: String,
        handler_version: String,
        stripe_customer_id: String,
        user_id: String,
        invocation_id: String,
        results: Vec<TransactionResult>,
    },
    Metrics {
        handler_id: String,
        handler_version: String,
        user_id: String,
        metrics: Vec<Metric>,
    },
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
        let sqs_client = aws_sdk_sqs::Client::new(&config);

        sqs_client
            .send_message()
            .message_body(serde_json::to_string(request).unwrap())
            .queue_url(&self.queue_url)
            .send()
            .await?;

        Ok(())
    }
}
