use regex::{Captures, Regex};
use std::env;
use tokio::join;

use lambda_extension::{
    service_fn, tracing, Error, Extension, LambdaTelemetry, LambdaTelemetryRecord, SharedService,
};
use serde_json::json;
use shared::{
    events::EventService,
    reporting_sdk::{self, ReportingSdk, SQSReportingSdk},
};

const LOG_REGEX_PATTERN: &str = r"(?x)^(?P<time>[\d\-T:.Z]+)\s+(?P<uuid>[a-f0-9\-]+)\s+(?P<log_level>[A-Z]+)\s+(?P<log_message>[\s\S]+)$";
const LOG_TABLE: &str = "ingest_logs";

fn record_to_json(record: String) -> Option<serde_json::Value> {
    let function_id = env::var("FUNCTION_ID").expect("Function ID is undefined");
    let chain_id = env::var("CHAIN_ID").expect("Chain ID is undefined");
    let deployment_id = env::var("DEPLOYMENT_ID").expect("Deployment ID is undefined");

    let re = Regex::new(LOG_REGEX_PATTERN).unwrap();
    let captures = re
        .captures(record.as_str())
        .map_or(Err("Failed to parse log record"), Ok)?;

    Some(json!({
      "function_id": function_id,
      "chain_id": chain_id,
      "deployment_id": deployment_id,
      "time": captures["time"].to_string(),
      "invocation_id": captures["uuid"].to_string(),
      "log_level": captures["log_level"].to_string(),
      "log_message": captures["log_message"].to_string(),
    }))
}

async fn upload_logs(logs: Vec<String>) -> Result<(), Error> {
    let events_service = EventService::new_with_defaults();

    let records: Vec<serde_json::Value> = logs
        .into_iter()
        .map(record_to_json)
        .filter(Option::is_some)
        .map(Option::unwrap)
        .collect();

    if records.is_empty() {
        return Ok(());
    }

    Ok(events_service.report_events(LOG_TABLE, records).await?)
}

async fn report_metrics(
    request: reporting_sdk::Report,
) -> Result<(), reporting_sdk::errors::ReportingSdkError> {
    let reporting_sdk = SQSReportingSdk::new_with_defaults().await;

    reporting_sdk.handle(&request).await?;

    Ok(())
}

async fn telemetry(events: Vec<LambdaTelemetry>) -> Result<(), Error> {
    let mut logs = Vec::new();
    let mut all_metrics: Vec<reporting_sdk::Metric> = Vec::new();

    let function_id = env::var("FUNCTION_ID").expect("Function ID is undefined");
    let chain_id = env::var("CHAIN_ID").expect("Chain ID is undefined");
    let deployment_id = env::var("DEPLOYMENT_ID").expect("Deployment ID is undefined");

    for event in events {
        match event.record {
            LambdaTelemetryRecord::Function(record) => {
                logs.push(record);
            }
            LambdaTelemetryRecord::PlatformReport {
                metrics,
                request_id: _,
                status: _,
                error_type: _,
                spans: _,
                tracing: _,
            } => all_metrics.push(reporting_sdk::Metric {
                duration_ms: metrics.duration_ms,
                billed_duration_ms: metrics.billed_duration_ms,
                memory_size_mb: metrics.memory_size_mb,
                max_memory_used_mb: metrics.max_memory_used_mb,
                init_duration_ms: metrics.init_duration_ms,
                restore_duration_ms: metrics.restore_duration_ms,
            }),
            _ => (),
        }
    }

    let _ = join!(
        upload_logs(logs),
        report_metrics(reporting_sdk::Report::Metrics {
            function_id: function_id.clone(),
            chain_id: chain_id.clone(),
            project_id: env::var("PROJECT_ID")
                .expect("PROJECT_ID is not defined")
                .parse()
                .unwrap(),
            metrics: all_metrics,
            deployment_id: deployment_id.clone(),
        })
    );

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    let telemetry_processor = SharedService::new(service_fn(telemetry));

    Extension::new()
        .with_telemetry_processor(telemetry_processor)
        .run()
        .await?;

    Ok(())
}
