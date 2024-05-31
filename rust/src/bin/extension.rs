use regex::Regex;
use serde::{Deserialize, Serialize};
use std::env;
use tokio::join;

use lambda_extension::{
    service_fn, tracing, Error, Extension, LambdaTelemetry, LambdaTelemetryRecord, SharedService,
};
use reqwest::blocking::Client;
use serde_json::json;

/// Report metrics
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct ReportMetrics {
    handler_id: String,
    pub duration_ms: f64,
    pub billed_duration_ms: u64,
    pub memory_size_mb: u64,
    pub max_memory_used_mb: u64,
    pub init_duration_ms: Option<f64>,
    pub restore_duration_ms: Option<f64>,
}

const TINYBIRD_API_KEY: &'static str = env!("TINYBIRD_API_KEY");

async fn upload_logs(logs: Vec<String>) -> Result<(), Error> {
    let handler_id = env::var("HANDLER_ID").expect("Handler ID is undefined");

    let records: Vec<String> = logs.into_iter().map(|record|{
      let re = Regex::new(r"(?x)^(?P<time>[\d\-T:.Z]+)\s+(?P<uuid>[a-f0-9\-]+)\s+(?P<log_level>[A-Z]+)\s+(?P<log_message>[\s\S]+)$").unwrap();
      print!("{:?}", re);
      re.captures(&record).map(|result| serde_json::to_string(&json!({
        "handler_id": handler_id,
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

async fn upload_metrics(metrics: Vec<ReportMetrics>) -> Result<(), Error> {
    let records: Vec<String> = metrics
        .into_iter()
        .map(|record| serde_json::to_string(&record).unwrap())
        .collect();

    let client = Client::new();
    let res = client.post("https://api.eu-central-1.aws.tinybird.co/v0/events?name=ingest_metrics")
      .header("Authorization", "Bearer REDACTED")
      .body(records.join("\n"))
      .send();

    match res {
        Ok(res) => println!("Successfully uploaded: {:?}", res.text()),
        Err(e) => println!("Error: {:?}", e),
    }

    Ok(())
}

async fn telemetry(events: Vec<LambdaTelemetry>) -> Result<(), Error> {
    let mut logs = Vec::new();
    let mut all_metrics = Vec::new();
    let handler_id = env::var("HANDLER_ID").expect("Handler ID is undefined");

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
            } => all_metrics.push(ReportMetrics {
                handler_id: handler_id.clone(),
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

    let _ = join!(upload_logs(logs), upload_metrics(all_metrics));

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
