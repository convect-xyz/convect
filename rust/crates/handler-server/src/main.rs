use std::{env, sync::Arc};

use axum::{
    routing::{get, post},
    Router,
};
use futures::lock::Mutex;
use lambda_extension::{service_fn, Error, LambdaEvent, NextEvent};
use shared::{
    reporting_sdk::{ReportingSdk, SQSReportingSdk},
    types::processing,
};

#[derive(Clone)]
struct AppState {
    pipeline: Arc<Mutex<processing::State>>,
    reporting: Arc<dyn ReportingSdk + Send + Sync>,
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
        pipeline,
        reporting: Arc::new(reporting_sdk),
    };

    let app = Router::new()
        .route("/results", post(results::handler))
        .route("/pipeline", get(get_pipeline::handler))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4121").await.unwrap();

    tokio::spawn(async {
        println!("Starting server");
        axum::serve(listener, app).await.unwrap();
        println!("Started server");
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
    use axum::{debug_handler, BoxError, Json};
    use futures::TryFutureExt;
    use serde::Deserialize;
    use serde_json::{json, Value};
    use shared::reporting_sdk::{self, TransactionResult};

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

        let failed_tx = payload
            .results
            .iter()
            .find(|v| v.failed_label.is_some())
            .map(|v| v.clone());

        app_state
            .reporting
            .handle(&reporting_sdk::Request {
                handler_id: env::var("HANDLER_ID").expect("HANDLER_ID is not defined"),
                handler_version: env::var("HANDLER_VERSION")
                    .expect("HANDLER_VERSION is not defined"),
                stripe_customer_id: env::var("STRIPE_CUSTOMER_ID")
                    .expect("STRIPE_CUSTOMER_ID is not defined"),
                user_id: Some(env::var("USER_ID").expect("USER_ID is not defined")),
                invocation_id: payload.invocation_id,
                results: payload.results,
            })
            .await
            .unwrap();

        if let Some(failed_tx) = failed_tx {
            fail_process_state(&app_state, &failed_tx).await.unwrap();

            match make_messages_reprocessable(&sqs_client, &payload.message_ids).await {
                Ok(_) => println!("Changed message visibility"),
                Err(e) => println!("Error: {:?}", e),
            };
        } else {
            unfail_process_state(&app_state).await.unwrap();
        }

        return Json(json!({"ok": true}));
    }

    async fn make_messages_reprocessable(
        sqs_client: &aws_sdk_sqs::Client,
        message_ids: &Vec<String>,
    ) -> Result<(), BoxError> {
        Ok(sqs_client
            .change_message_visibility_batch()
            .set_queue_url(Some(
                env::var("TRANSACTION_QUEUE_URL").expect("TX Queue not defined"),
            ))
            .set_entries(Some(
                message_ids
                    .into_iter()
                    .map(|v| {
                        ChangeMessageVisibilityBatchRequestEntry::builder()
                            .set_id(Some(uuid::Uuid::new_v4().to_string()))
                            .set_receipt_handle(Some(v.to_string()))
                            .set_visibility_timeout(Some(180))
                            .build()
                            .unwrap()
                    })
                    .collect(),
            ))
            .send()
            .map_ok(|_| ())
            .await?)
    }

    async fn fail_process_state(
        app_state: &AppState,
        failed_tx: &TransactionResult,
    ) -> Result<(), BoxError> {
        let mut state = app_state.pipeline.lock().await;

        Ok(state
            .update()
            .set_error_label(failed_tx.failed_label.as_ref().unwrap().label.to_string())
            .set_error_tx(failed_tx.transaction_hash.to_string())
            .send()
            .await?)
    }

    async fn unfail_process_state(app_state: &AppState) -> Result<(), BoxError> {
        let mut state = app_state.pipeline.lock().await;

        Ok(state
            .update()
            .set_error_label("".to_string())
            .set_error_tx("".to_string())
            .send()
            .await?)
    }
}

mod get_pipeline {
    use axum::extract::{Json, State};
    use shared::types::processing;

    use crate::AppState;

    pub async fn handler(State(app_state): State<AppState>) -> Json<processing::Inner> {
        let process_state = app_state.pipeline.lock().await;
        return Json(process_state.inner().clone());
    }
}
