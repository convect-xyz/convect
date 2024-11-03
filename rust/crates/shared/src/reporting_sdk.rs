use std::env;

use async_trait::async_trait;
use aws_config::BehaviorVersion;
use aws_sdk_s3::error::BoxError;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::s3::S3;

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
pub enum Report {
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

impl Report {
    pub async fn from_stored_report(stored_report: StoredReport) -> Report {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let s3_client = aws_sdk_s3::Client::new(&config);

        let object = s3_client
            .get_object()
            .bucket(&stored_report.bucket)
            .key(&stored_report.key)
            .send()
            .await
            .unwrap();

        let data = object.body.collect().await.unwrap();
        let content = String::from_utf8(data.into_bytes().to_vec()).unwrap();
        serde_json::from_str(&content).unwrap()
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StoredReport {
    pub bucket: String,
    pub key: String,
}

impl StoredReport {
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
    async fn handle(&self, request: &Report) -> Result<(), BoxError>;
}

#[derive(Clone)]
pub struct SQSReportingSdk<S: S3 + Sync + Send> {
    queue_url: String,
    s3: S,
    sqs: aws_sdk_sqs::Client,
}

impl<S: S3 + Sync + Send> SQSReportingSdk<S> {
    pub async fn new_with_defaults() -> SQSReportingSdk<aws_sdk_s3::Client> {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let s3_client = aws_sdk_s3::Client::new(&config);
        let sqs_client = aws_sdk_sqs::Client::new(&config);

        SQSReportingSdk {
            queue_url: env::var("REPORTING_QUEUE_URL").expect("REPORTING_QUEUE_URL must be set"),
            s3: s3_client,
            sqs: sqs_client,
        }
    }
}

#[async_trait]
impl<S: S3 + Sync + Send> ReportingSdk for SQSReportingSdk<S> {
    async fn handle(&self, report: &Report) -> Result<(), BoxError> {
        let bucket = String::from("ingest-fetch-logs");
        let key = format!("convect-results/{}.json", format!("{}", Uuid::new_v4()));
        self.s3
            .put_s3_object(
                bucket.as_str(),
                key.as_str(),
                serde_json::to_string(report)?,
            )
            .await?;

        self.sqs
            .send_message()
            .message_body(serde_json::to_string(&StoredReport { bucket, key }).unwrap())
            .queue_url(&self.queue_url)
            .send()
            .await?;

        Ok(())
    }
}
