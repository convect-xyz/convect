use std::{env, sync::Arc};

use crate::s3::S3;
use async_trait::async_trait;
use aws_config::BehaviorVersion;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcessedTransactionResult {
    pub transaction_hash: String,
    pub handler: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum BatchStatus {
    #[serde(rename = "SUCCESS")]
    Success,
    #[serde(rename = "FAILURE")]
    Failure,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcessedBatchResult {
    pub batch_id: String,
    pub message_id: String,
    pub timestamp_ms: i64,
    pub status: BatchStatus,
    pub transactions: Vec<ProcessedTransactionResult>,
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
        results: Vec<ProcessedBatchResult>,
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StoredReport {
    pub bucket: String,
    pub key: String,
}

#[derive(Clone)]
pub struct StoredReportService<S: S3> {
    s3: Arc<Mutex<S>>,
}

impl<S: S3> StoredReportService<S> {
    pub fn new(s3: S) -> Self {
        Self {
            s3: Arc::new(Mutex::new(s3)),
        }
    }

    pub async fn delete_stored_report(
        &self,
        stored_report: &StoredReport,
    ) -> Result<(), errors::DeleteStoredReportError> {
        let s3 = self.s3.lock().await;
        s3.delete_s3_object(stored_report.bucket.as_str(), stored_report.key.as_str())
            .await?;

        Ok(())
    }

    pub async fn get_report(
        &self,
        stored_report: &StoredReport,
    ) -> Result<Report, errors::GetReportError> {
        let s3 = self.s3.lock().await;
        let body = s3
            .get_s3_object(stored_report.bucket.as_str(), stored_report.key.as_str())
            .await?;

        Ok(serde_json::from_str(&body)?)
    }

    pub async fn store_report(
        &self,
        report: &Report,
    ) -> Result<StoredReport, errors::StoreReportError> {
        let s3 = self.s3.lock().await;
        let bucket = String::from("ingest-fetch-logs");
        let key = format!("convect-results/{}.json", format!("{}", Uuid::new_v4()));

        s3.put_s3_object(
            bucket.as_str(),
            key.as_str(),
            serde_json::to_string(report)?,
        )
        .await?;

        Ok(StoredReport { bucket, key })
    }
}

#[async_trait]
pub trait ReportingSdk {
    async fn handle(&self, request: &Report) -> Result<(), errors::ReportingSdkError>;
}

#[derive(Clone)]
pub struct SQSReportingSdk<S: S3> {
    queue_url: String,
    stored_report_service: StoredReportService<S>,
    sqs: Arc<Mutex<aws_sdk_sqs::Client>>,
}

impl SQSReportingSdk<aws_sdk_s3::Client> {
    pub async fn new_with_defaults() -> SQSReportingSdk<aws_sdk_s3::Client> {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let s3_client = aws_sdk_s3::Client::new(&config);
        let sqs_client = aws_sdk_sqs::Client::new(&config);

        SQSReportingSdk {
            queue_url: env::var("REPORTING_QUEUE_URL").expect("REPORTING_QUEUE_URL must be set"),
            stored_report_service: StoredReportService::new(s3_client),
            sqs: Arc::new(Mutex::new(sqs_client)),
        }
    }
}

#[async_trait]
impl<S: S3> ReportingSdk for SQSReportingSdk<S> {
    async fn handle(&self, report: &Report) -> Result<(), errors::ReportingSdkError> {
        let stored_report = self.stored_report_service.store_report(report).await?;

        let sqs = self.sqs.lock().await;
        sqs.send_message()
            .message_body(serde_json::to_string(&stored_report)?)
            .queue_url(&self.queue_url)
            .send()
            .await?;

        Ok(())
    }
}

pub mod errors {
    use aws_sdk_sqs::error::SdkError;
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum ReportingSdkError {
        #[error("SDK error: {0}")]
        SdkError(#[from] SdkError<aws_sdk_sqs::operation::send_message::SendMessageError>),
        #[error("S3 error: {0}")]
        S3Error(#[from] crate::s3::errors::PutS3ObjectError),
        #[error("JSON error: {0}")]
        JsonError(#[from] serde_json::Error),
        #[error("Store report error: {0}")]
        StoreReportError(#[from] StoreReportError),
    }

    #[derive(Error, Debug)]
    pub enum DeleteStoredReportError {
        #[error("S3 error: {0}")]
        S3Error(#[from] crate::s3::errors::DeleteS3ObjectError),
        #[error("JSON error: {0}")]
        JsonError(#[from] serde_json::Error),
    }

    #[derive(Error, Debug)]
    pub enum GetReportError {
        #[error("S3 error: {0}")]
        S3Error(#[from] crate::s3::errors::GetS3ObjectError),
        #[error("JSON error: {0}")]
        JsonError(#[from] serde_json::Error),
    }

    #[derive(Error, Debug)]
    pub enum StoreReportError {
        #[error("S3 error: {0}")]
        S3Error(#[from] crate::s3::errors::PutS3ObjectError),
        #[error("JSON error: {0}")]
        JsonError(#[from] serde_json::Error),
    }
}
