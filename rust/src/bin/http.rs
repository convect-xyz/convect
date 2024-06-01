use std::{env, sync::Arc};

use axum::{
    routing::{get, post},
    Router,
};
use futures::lock::Mutex;
use ingest::types::processing;
use lambda_extension::{service_fn, Error, LambdaEvent, NextEvent};

async fn my_extension(event: LambdaEvent) -> Result<(), Error> {
    match event.next {
        NextEvent::Shutdown(_e) => {}
        NextEvent::Invoke(_e) => {}
    }
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    let handler_id = env::var("HANDLER_ID").expect("Handler ID env not set");
    let handler_version = env::var("HANDLER_VERSION").expect("Handler ID env not set");
    let state = processing::State::load(handler_id, handler_version).await;
    let pipeline = Arc::new(Mutex::new(state));

    let app = Router::new()
        .route("/results", post(results::handler))
        .route("/pipeline", get(get_pipeline::handler))
        .with_state(pipeline);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:4121").await.unwrap();

    tokio::spawn(async {
        println!("Starting server");
        axum::serve(listener, app).await.unwrap();
    });

    // tracing_subscriber::fmt()
    //     .with_max_level(tracing::Level::INFO)
    //     .with_target(false)
    //     .without_time()
    //     .init();

    let func = service_fn(my_extension);

    lambda_extension::run(func).await
}

mod results {
    use std::env;
    use std::sync::Arc;

    use aws_config::BehaviorVersion;
    use aws_sdk_sqs::types::ChangeMessageVisibilityBatchRequestEntry;
    use axum::extract::State;
    use axum::{debug_handler, Json};
    use chrono::DateTime;
    use diesel_async::RunQueryDsl;
    use futures::lock::Mutex;
    use ingest::connection::establish_connection;
    use ingest::telemetry::{self, ProcessedTransactionTelemetry};
    use ingest::types::processing;
    use ingest::{models::ProcessedTransaction, schema::processed_transactions};
    use serde::Deserialize;
    use serde_json::{json, Value};

    #[derive(Deserialize, Debug)]
    pub struct TransactionResultLabel {
        pub label: String,
        pub timestamp_ms: i64,
    }

    #[derive(Deserialize, Debug)]
    pub struct TransactionResult {
        pub transaction_hash: String,
        pub successful_labels: Vec<TransactionResultLabel>,
        pub failed_label: Option<TransactionResultLabel>,
    }

    #[derive(Deserialize, Debug)]
    pub struct Request {
        pub invocation_id: String,
        pub message_ids: Vec<String>,
        pub results: Vec<TransactionResult>,
    }

    #[debug_handler]
    pub async fn handler(
        State(process_state): State<Arc<Mutex<processing::State>>>,
        Json(payload): Json<Request>,
    ) -> Json<Value> {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let sqs_client = aws_sdk_sqs::Client::new(&config);
        let handler_id = env::var("HANDLER_ID").expect("Handler ID env not set");

        let failed_tx = payload.results.iter().find(|v| v.failed_label.is_some());

        let mut state = process_state.lock().await;
        if let Some(failed_tx) = failed_tx {
            let update_r = state
                .update()
                .set_error_label(failed_tx.failed_label.as_ref().unwrap().label.to_string())
                .set_error_tx(failed_tx.transaction_hash.to_string())
                .send()
                .await;

            match update_r {
                Ok(_) => println!("Updated pipeline"),
                Err(e) => println!("Error: {:?}", e),
            }

            let result = sqs_client
                .change_message_visibility_batch()
                .set_queue_url(Some(
                    env::var("TRANSACTION_QUEUE_URL").expect("TX Queue not defined"),
                ))
                .set_entries(Some(
                    payload
                        .message_ids
                        .into_iter()
                        .map(|v| {
                            ChangeMessageVisibilityBatchRequestEntry::builder()
                                .set_id(Some(uuid::Uuid::new_v4().to_string()))
                                .set_receipt_handle(Some(v))
                                .set_visibility_timeout(Some(180))
                                .build()
                                .unwrap()
                        })
                        .collect(),
                ))
                .send()
                .await;

            match result {
                Ok(_) => println!("Changed message visibility"),
                Err(e) => println!("Error: {:?}", e),
            };
        } else {
            let _ = state
                .update()
                .set_error_label("".to_string())
                .set_error_tx("".to_string())
                .send()
                .await;
        }

        let data: Vec<_> = payload
            .results
            .iter()
            .map(|r| {
                let mut rows = Vec::new();

                for label in r.successful_labels.iter() {
                    rows.push(ProcessedTransaction {
                        transaction_hash: r.transaction_hash.clone(),
                        label: label.label.clone(),
                        status: "SUCCESS".to_string(),
                        timestamp: DateTime::from_timestamp_millis(label.timestamp_ms).unwrap(),
                        handler_id: &handler_id,
                    })
                }

                if let Some(label) = r.failed_label.as_ref() {
                    rows.push(ProcessedTransaction {
                        transaction_hash: r.transaction_hash.clone(),
                        label: label.label.clone(),
                        status: "FAILED".to_string(),
                        timestamp: DateTime::from_timestamp_millis(label.timestamp_ms).unwrap(),
                        handler_id: &handler_id,
                    })
                }

                rows
            })
            .flatten()
            .collect();

        println!("Establishing connection");
        let mut conn = establish_connection().await;
        println!("Established connection");

        let tx_telemtry = telemetry::stripe::StripeProcessedTransactionTelemetry::from_env();

        let record = tx_telemtry
            .record_invocation(
                payload.invocation_id,
                payload.results.len().try_into().unwrap(),
            )
            .await;

        match record {
            Err(e) => println!("Error recording tx usage: {:?}", e),
            _ => println!("Sent telemetry"),
        }

        let r = diesel::insert_into(processed_transactions::table)
            .values(data)
            .execute(&mut conn)
            .await;

        match r {
            Ok(_) => println!("Inserted"),
            Err(e) => println!("Error {:?}", e),
        }

        return Json(json!({"ok": true}));
    }
}

mod get_pipeline {
    use axum::extract::{Json, State};
    use futures::lock::Mutex;
    use ingest::types::processing;
    use std::sync::Arc;

    pub async fn handler(
        State(process_state): State<Arc<Mutex<processing::State>>>,
    ) -> Json<processing::Inner> {
        let process_state = process_state.lock().await;
        return Json(process_state.inner().clone());
    }
}
