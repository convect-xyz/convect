use aws_lambda_events::event::sqs::SqsEvent;
use chrono::{DateTime, Utc};
use diesel_async::{scoped_futures::ScopedFutureExt, AsyncConnection, RunQueryDsl};
use futures::try_join;
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};
use shared::{
    connection::establish_connection_pool,
    models::{Invocation, ProcessedTransaction},
    reporting_sdk,
    schema::{invocation, processed_transactions},
};

fn main() -> Result<(), Error> {
    let _guard = sentry::init(("https://c749dc7d2929977538ed3abbd4fbdb4a@o4507692210454528.ingest.de.sentry.io/4507692217729104", sentry::ClientOptions {
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
    let pool = establish_connection_pool().await;

    let requests: Vec<reporting_sdk::Request> = event
        .payload
        .records
        .into_iter()
        .map(|r| serde_json::from_str(r.body.unwrap().as_str()).unwrap())
        .collect();

    let transactions: Vec<_> = requests
        .iter()
        .map(extract_transactions)
        .flatten()
        .collect();

    let invocations: Vec<_> = requests
        .iter()
        .map(|r| match &r.user_id {
            Some(user_id) => Some(Invocation {
                invocation_id: &r.invocation_id,
                user_id,
                num_processed: r.results.len().try_into().unwrap(),
                timestamp: Utc::now(),
            }),
            None => None,
        })
        .filter(Option::is_some)
        .map(Option::unwrap)
        .collect();

    pool.get()
        .await?
        .transaction::<_, Error, _>(|conn| {
            async move {
                try_join!(
                    diesel::insert_into(invocation::table)
                        .values(invocations)
                        .execute(conn),
                    diesel::insert_into(processed_transactions::table)
                        .values(transactions)
                        .execute(conn)
                )?;

                Ok(())
            }
            .scope_boxed()
        })
        .await
        .unwrap();

    Ok(())
}

fn extract_transactions(r: &reporting_sdk::Request) -> Vec<ProcessedTransaction> {
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
                batch_id: &result.batch_id,
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
                batch_id: &result.batch_id,
            })
        }
    }

    rows
}
