use std::{env, sync::Arc};

use axum::{
    routing::{get, post},
    Router,
};
use futures::lock::Mutex;
use ingest::{
    connection::{establish_connection_pool, DbPool},
    reporting_sdk::{ReportingSdk, SQSReportingSdk},
    types::processing,
};
use lambda_extension::{service_fn, Error, LambdaEvent, NextEvent};

#[derive(Clone)]
struct AppState {
    pipeline: Arc<Mutex<processing::State>>,
    pool: DbPool,
    reporting: Box<dyn ReportingSdk>,
}

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
    let reporting_sdk = SQSReportingSdk::new();
    let app_state = AppState {
        pool: establish_connection_pool().await,
        pipeline,
        reporting: reporting_sdk,
    };

    let app = Router::new()
        .route("/results", post(results::handler))
        .route("/pipeline", get(get_pipeline::handler))
        .with_state(app_state);

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

    use aws_config::BehaviorVersion;
    use aws_sdk_sqs::types::ChangeMessageVisibilityBatchRequestEntry;
    use axum::extract::State;
    use axum::{debug_handler, Json};
    use chrono::DateTime;
    use diesel_async::RunQueryDsl;
    use ingest::reporting_sdk::{self, ReportingSdk};
    use ingest::telemetry::{self, ProcessedTransactionTelemetry};
    use ingest::{models::ProcessedTransaction, schema::processed_transactions};
    use serde::Deserialize;
    use serde_json::{json, Value};

    use crate::AppState;

    #[derive(Deserialize, Debug)]
    pub struct Request {
        pub invocation_id: String,
        pub message_ids: Vec<String>,
        pub results: Vec<reporting_sdk::TransactionResult>,
    }

    #[debug_handler]
    pub async fn handler(
        State(app_state): State<AppState>,
        Json(payload): Json<Request>,
    ) -> Json<Value> {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let sqs_client = aws_sdk_sqs::Client::new(&config);
        let handler_id = env::var("HANDLER_ID").expect("Handler ID env not set");
        let handler_version = env::var("HANDLER_VERSION").expect("Handler VERSION env not set");

        let failed_tx = payload.results.iter().find(|v| v.failed_label.is_some());

        let mut state = app_state.pipeline.lock().await;
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

        app_state
            .reporting
            .handle(&reporting_sdk::Request {
                handler_id: env::var("HANDLER_ID").expect("HANDLER_ID is not defined"),
                handler_version: env::var("HANDLER_VERSION")
                    .expect("HANDLER_VERSION is not defined"),
                stripe_customer_id: env::var("STRIPE_CUSTOMER_ID")
                    .expect("STRIPE_CUSTOMER_ID is not defined"),
                invocation_id: payload.invocation_id,
                results: payload.results,
            })
            .await;

        // app_state
        return Json(json!({"ok": true}));
    }
}

mod get_pipeline {
    use axum::extract::{Json, State};
    use ingest::types::processing;

    use crate::AppState;

    pub async fn handler(State(app_state): State<AppState>) -> Json<processing::Inner> {
        let process_state = app_state.pipeline.lock().await;
        return Json(process_state.inner().clone());
    }
}
