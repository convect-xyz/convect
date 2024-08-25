use regex::Regex;
use std::env;
use tokio::join;

use lambda_extension::{
    service_fn, tracing, Error, Extension, LambdaTelemetry, LambdaTelemetryRecord, LogBuffering,
    SharedService,
};
use reqwest::blocking::Client;
use serde_json::json;
use shared::reporting_sdk::{self, ReportingSdk, SQSReportingSdk};

const TINYBIRD_API_KEY: &'static str = env!("TINYBIRD_API_KEY");

async fn upload_logs(logs: Vec<String>) -> Result<(), Error> {
    let function_id = env::var("FUNCTION_ID").expect("Function ID is undefined");
    let chain_id = env::var("CHAIN_ID").expect("Chain ID is undefined");
    let deployment_id = env::var("DEPLOYMENT_ID").expect("Deployment ID is undefined");

    let records: Vec<String> = logs.into_iter().map(|record|{
      let re = Regex::new(r"(?x)^(?P<time>[\d\-T:.Z]+)\s+(?P<uuid>[a-f0-9\-]+)\s+(?P<log_level>[A-Z]+)\s+(?P<log_message>[\s\S]+)$").unwrap();

      re.captures(&record).map(|result| serde_json::to_string(&json!({
        "function_id": function_id,
        "chain_id": chain_id,
        "deployment_id": deployment_id,
        "time": result["time"].to_string(),
        "invocation_id": result["uuid"].to_string(),
        "log_level": result["log_level"].to_string(),
        "log_message": result["log_message"].to_string(),
      })).unwrap())
    }).filter(Option::is_some).map(Option::unwrap).collect();

    if records.is_empty() {
        return Ok(());
    }

    let client = Client::new();
    let res = client
        .post("https://api.eu-central-1.aws.tinybird.co/v0/events?name=ingest_logs")
        .header("Authorization", format!("Bearer {TINYBIRD_API_KEY}"))
        .body(records.join("\n"))
        .send();

    match res {
        Ok(res) => println!("Successfully uploaded: {:?}", res.text()),
        Err(e) => println!("Error: {:?}", e),
    }

    Ok(())
}

async fn upload_metrics(request: reporting_sdk::Request) -> Result<(), Error> {
    let reporting_sdk = SQSReportingSdk::new();

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
        upload_metrics(reporting_sdk::Request::Metrics {
            function_id: function_id.clone(),
            chain_id: chain_id.clone(),
            user_id: env::var("USER_ID").expect("USER_ID is not defined"),
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
        .with_telemetry_buffering(LogBuffering {
            timeout_ms: 25,
            ..Default::default()
        })
        .run()
        .await?;

    Ok(())
}
