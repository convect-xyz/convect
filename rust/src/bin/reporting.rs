use aws_lambda_events::event::sqs::SqsEvent;
use chrono::DateTime;
use diesel_async::RunQueryDsl;
use futures::future::join_all;
use ingest::{
    connection::establish_connection_pool,
    models::ProcessedTransaction,
    reporting_sdk,
    schema::processed_transactions,
    telemetry::{ProcessedTransactionTelemetry, StripeProcessedTransactionTelemetry},
};
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};

async fn function_handler(event: LambdaEvent<SqsEvent>) -> Result<(), Error> {
    let pool = establish_connection_pool().await;

    let data: Vec<reporting_sdk::Request> = event
        .payload
        .records
        .into_iter()
        .map(|r| serde_json::from_str(r.body.unwrap().as_str()).unwrap())
        .collect();

    let items: Vec<_> = data
        .iter()
        .map(|r| {
            let mut rows = Vec::new();

            for result in r.results.iter() {
                for label in result.successful_labels.iter() {
                    rows.push(ProcessedTransaction {
                        transaction_hash: result.transaction_hash.clone(),
                        label: label.label.clone(),
                        status: "SUCCESS".to_string(),
                        timestamp: DateTime::from_timestamp_millis(label.timestamp_ms).unwrap(),
                        handler_id: &r.handler_id,
                        handler_version: &r.handler_version,
                    })
                }

                if let Some(label) = result.failed_label.as_ref() {
                    rows.push(ProcessedTransaction {
                        transaction_hash: result.transaction_hash.clone(),
                        label: label.label.clone(),
                        status: "FAILED".to_string(),
                        timestamp: DateTime::from_timestamp_millis(label.timestamp_ms).unwrap(),
                        handler_id: &r.handler_id,
                        handler_version: &r.handler_version,
                    })
                }
            }

            rows
        })
        .flatten()
        .collect();

    let tx_telemtry = StripeProcessedTransactionTelemetry::from_env();

    join_all(data.iter().map(|result| {
        tx_telemtry.record_invocation(
            result.invocation_id.clone(),
            result.results.len().try_into().unwrap(),
        )
    }))
    .await;

    let mut conn = pool.get().await?;
    let r = diesel::insert_into(processed_transactions::table)
        .values(items)
        .execute(&mut conn)
        .await;

    match r {
        Ok(_) => println!("Inserted"),
        Err(e) => println!("Error {:?}", e),
    }

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
