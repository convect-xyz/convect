use std::{collections::HashSet, env};

use aws_config::BehaviorVersion;
use aws_lambda_events::event::sqs::SqsEvent;
use chrono::{DateTime, Utc};
use config::Config;
use diesel_async::RunQueryDsl;
use futures::{future::join_all, join};
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};
use shared::{
    analytics_models::{Invocation, Metric, ProcessedBatch, ProcessedTransaction},
    analytics_schema::{invocation, processed_batch, processed_transaction, reported_metrics},
    connection::establish_connection_pool,
    reporting_sdk,
    telemetry::{ProcessedTransactionTelemetry, StripeProcessedTransactionTelemetry},
};

mod config;

#[derive(Debug)]
struct ExtractedRequest {
    transactions: Vec<ProcessedTransaction>,
    batches: Vec<ProcessedBatch>,
    metrics: Vec<(String, Metric)>,
    invocations: Vec<Invocation>,
}

fn main() -> Result<(), Error> {
    let _guard = sentry::init((
      "https://c749dc7d2929977538ed3abbd4fbdb4a@o4507692210454528.ingest.de.sentry.io/4507692217729104",
      sentry::ClientOptions {
          release: sentry::release_name!(),
          ..Default::default()
      }));

    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async move {
            tracing::init_default_subscriber();
            run(service_fn(function_handler)).await
        })
}

async fn function_handler(event: LambdaEvent<SqsEvent>) -> Result<(), Error> {
    let config = Config::new();
    let s3_client =
        aws_sdk_s3::Client::new(&aws_config::load_defaults(BehaviorVersion::latest()).await);

    let pool = establish_connection_pool().await;
    let telemetry = StripeProcessedTransactionTelemetry::new(config.stripe_customer_id.clone());

    let stored_reports: Vec<reporting_sdk::StoredReport> = event
        .payload
        .records
        .into_iter()
        .map(|r| serde_json::from_str(r.body.unwrap().as_str()).unwrap())
        .collect();
    println!("stored_reports: {stored_reports:?}");

    let stored_report_service = reporting_sdk::StoredReportService::new(s3_client);
    let reports: Vec<reporting_sdk::Report> =
        stored_report_service.get_reports(&stored_reports).await?;

    let extracted: Vec<_> = reports.iter().map(extract_request).collect();
    println!("extracted: {extracted:?}");

    let conn = &mut pool.get().await?;

    let (invocations_result, processed_batch_result, transactions_result, metrics_result) = join!(
        diesel::insert_into(invocation::table)
            .values(
                extracted
                    .iter()
                    .flat_map(|f| &f.invocations)
                    .collect::<Vec<_>>()
            )
            .execute(conn),
        diesel::insert_into(processed_batch::table)
            .values(
                extracted
                    .iter()
                    .flat_map(|f| &f.batches)
                    .collect::<Vec<_>>()
            )
            .execute(conn),
        diesel::insert_into(processed_transaction::table)
            .values(
                extracted
                    .iter()
                    .flat_map(|f| &f.transactions)
                    .collect::<Vec<_>>()
            )
            .execute(conn),
        diesel::insert_into(reported_metrics::table)
            .values(
                extracted
                    .iter()
                    .flat_map(|f| &f.metrics)
                    .map(|m| &m.1)
                    .collect::<Vec<_>>()
            )
            .execute(conn)
    );

    invocations_result.unwrap();
    processed_batch_result.unwrap();
    transactions_result.unwrap();
    metrics_result.unwrap();

    join_all(
        extracted
            .iter()
            .flat_map(|r| &r.invocations)
            .map(|i| telemetry.record_invocation(i.invocation_id.clone()))
            .collect::<Vec<_>>(),
    )
    .await
    .into_iter()
    .collect::<Result<Vec<_>, _>>()
    .unwrap();

    join_all(extracted.iter().flat_map(|r| &r.metrics).map(|m| {
        telemetry.record_mb_secs(
            m.0.clone(),
            (m.1.billed_duration_ms * m.1.memory_size_mb)
                .try_into()
                .unwrap(),
        )
    }))
    .await
    .into_iter()
    .collect::<Result<Vec<_>, _>>()
    .unwrap();

    join_all(
        stored_reports
            .iter()
            .map(|stored_report| stored_report_service.delete_stored_report(stored_report)),
    )
    .await;

    Ok(())
}

fn extract_request(r: &reporting_sdk::Report) -> ExtractedRequest {
    let mut request = ExtractedRequest {
        transactions: Vec::new(),
        batches: Vec::new(),
        metrics: Vec::new(),
        invocations: Vec::new(),
    };

    match r {
        reporting_sdk::Report::Results {
            results,
            function_id,
            chain_id,
            project_id,
            invocation_id,
            deployment_id,
            ..
        } => {
            request.invocations.push(Invocation {
                project_id: project_id.clone(),
                invocation_id: invocation_id.clone(),
                timestamp: Utc::now(),
                num_processed: results
                    .iter()
                    .flat_map(|r| &r.transactions)
                    .map(|tx| &tx.transaction_hash)
                    .collect::<HashSet<&String>>()
                    .len()
                    .try_into()
                    .unwrap(),
                deployment_id: deployment_id.clone(),
            });

            for result in results.into_iter() {
                let processed_batch_id = uuid::Uuid::new_v4().to_string();
                request.batches.push(ProcessedBatch {
                    id: processed_batch_id.clone(),
                    timestamp: DateTime::from_timestamp_millis(result.timestamp_ms).unwrap(),
                    function_id: function_id.clone(),
                    batch_id: result.batch_id.clone(),
                    deployment_id: deployment_id.clone(),
                    status: match &result.status {
                        reporting_sdk::BatchStatus::Success => "SUCCESS",
                        reporting_sdk::BatchStatus::Failed { .. } => "FAILED",
                    }
                    .to_string(),
                    chain_id: chain_id.clone().parse().unwrap(),
                    error_message: match &result.status {
                        reporting_sdk::BatchStatus::Failed { message, .. } => Some(message.clone()),
                        _ => None,
                    },
                    error_stacktrace: match &result.status {
                        reporting_sdk::BatchStatus::Failed { stacktrace, .. } => {
                            Some(stacktrace.clone())
                        }
                        _ => None,
                    },
                });

                for tx in result.transactions.clone() {
                    request.transactions.push(ProcessedTransaction {
                        function_id: function_id.clone(),
                        deployment_id: deployment_id.clone(),
                        processed_batch_id: processed_batch_id.clone(),
                        transaction_hash: tx.transaction_hash,
                        chain_id: chain_id.clone().parse().unwrap(),
                        handler: tx.handler,
                        processed_log_indices: vec![],
                        timestamp: DateTime::from_timestamp_millis(result.timestamp_ms).unwrap(),
                        status: match &tx.status {
                            reporting_sdk::ProcessedTransactionStatus::Success => "SUCCESS",
                            reporting_sdk::ProcessedTransactionStatus::Failed => "FAILED",
                        }
                        .to_string(),
                    })
                }
            }
        }
        reporting_sdk::Report::Metrics {
            function_id,
            chain_id,
            metrics,
            deployment_id,
            project_id,
            ..
        } => {
            for metric in metrics.into_iter() {
                request.metrics.push((
                    metric.request_id.clone(),
                    Metric {
                        duration_ms: metric.duration_ms,
                        billed_duration_ms: metric.billed_duration_ms as i64,
                        memory_size_mb: metric.memory_size_mb as i64,
                        max_memory_used_mb: metric.max_memory_used_mb as i64,
                        init_duration_ms: metric.init_duration_ms,
                        restore_duration_ms: metric.restore_duration_ms,
                        handler_id: function_id.clone(),
                        handler_version: chain_id.clone(),
                        deployment_id: deployment_id.clone(),
                        project_id: project_id.clone(),
                    },
                ))
            }
        }
    };

    request
}
