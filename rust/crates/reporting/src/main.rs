use aws_config::BehaviorVersion;
use aws_lambda_events::event::sqs::SqsEvent;
use chrono::{DateTime, Utc};
use diesel_async::RunQueryDsl;
use futures::{future::join_all, join};
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};
use shared::{
    connection::establish_connection_pool,
    models::{Invocation, Metric, ProcessedBatch, ProcessedTransaction},
    reporting_sdk,
    schema::{invocation, processed_batch, processed_transaction, reported_metrics},
};

#[derive(Debug)]
enum ExtractedRequest {
    Transaction(ProcessedTransaction),
    Batch(ProcessedBatch),
    Metric(Metric),
    Invocation(Invocation),
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
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let s3_client = aws_sdk_s3::Client::new(&config);

    let pool = establish_connection_pool().await;

    let stored_reports: Vec<reporting_sdk::StoredReport> = event
        .payload
        .records
        .into_iter()
        .map(|r| serde_json::from_str(r.body.unwrap().as_str()).unwrap())
        .collect();

    let stored_report_service = reporting_sdk::StoredReportService::new(s3_client);
    let reports = join_all(
        stored_reports
            .iter()
            .map(|stored_report| stored_report_service.get_report(stored_report)),
    )
    .await
    .into_iter()
    .collect::<Result<Vec<_>, _>>()?;

    let extracted: Vec<_> = reports
        .into_iter()
        .map(extract_transactions)
        .flatten()
        .collect();

    println!("Extracted: {:?}", extracted);

    let invocations: Vec<_> = extracted
        .iter()
        .map(|r| match r {
            ExtractedRequest::Invocation(i) => Some(i),
            _ => None,
        })
        .filter(Option::is_some)
        .map(Option::unwrap)
        .collect();

    let transactions: Vec<_> = extracted
        .iter()
        .map(|r| match r {
            ExtractedRequest::Transaction(t) => Some(t),
            _ => None,
        })
        .filter(Option::is_some)
        .map(Option::unwrap)
        .collect();

    let metrics: Vec<_> = extracted
        .iter()
        .map(|r| match r {
            ExtractedRequest::Metric(m) => Some(m),
            _ => None,
        })
        .filter(Option::is_some)
        .map(Option::unwrap)
        .collect();

    let batches: Vec<_> = extracted
        .iter()
        .map(|r| match r {
            ExtractedRequest::Batch(b) => Some(b),
            _ => None,
        })
        .filter(Option::is_some)
        .map(Option::unwrap)
        .collect();

    let conn = &mut pool.get().await?;

    let (invocations_result, processed_batch_result, transactions_result, metrics_result) = join!(
        diesel::insert_into(invocation::table)
            .values(invocations)
            .execute(conn),
        diesel::insert_into(processed_batch::table)
            .values(batches)
            .execute(conn),
        diesel::insert_into(processed_transaction::table)
            .values(transactions)
            .execute(conn),
        diesel::insert_into(reported_metrics::table)
            .values(metrics)
            .execute(conn)
    );

    invocations_result.unwrap();
    processed_batch_result.unwrap();
    transactions_result.unwrap();
    metrics_result.unwrap();

    join_all(
        stored_reports
            .iter()
            .map(|stored_report| stored_report_service.delete_stored_report(stored_report)),
    )
    .await;

    Ok(())
}

fn extract_transactions(r: reporting_sdk::Report) -> Vec<ExtractedRequest> {
    let mut rows = Vec::new();

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
            rows.push(ExtractedRequest::Invocation(Invocation {
                project_id,
                invocation_id: invocation_id.clone(),
                timestamp: Utc::now(),
                num_processed: results.len().try_into().unwrap(),
                deployment_id: deployment_id.clone(),
            }));

            for result in results.into_iter() {
                let processed_batch_id = uuid::Uuid::new_v4().to_string();
                rows.push(ExtractedRequest::Batch(ProcessedBatch {
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
                }));

                for tx in result.transactions.into_iter() {
                    rows.push(ExtractedRequest::Transaction(ProcessedTransaction {
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
                    }))
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
                rows.push(ExtractedRequest::Metric(Metric {
                    duration_ms: metric.duration_ms,
                    billed_duration_ms: metric.billed_duration_ms as i64,
                    memory_size_mb: metric.memory_size_mb as i64,
                    max_memory_used_mb: metric.max_memory_used_mb as i64,
                    init_duration_ms: metric.init_duration_ms,
                    restore_duration_ms: metric.restore_duration_ms,
                    handler_id: function_id.clone(),
                    handler_version: chain_id.clone(),
                    deployment_id: deployment_id.clone(),
                    project_id,
                }))
            }
        }
    };

    rows
}
