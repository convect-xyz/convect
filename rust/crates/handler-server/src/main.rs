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

    let func = service_fn(my_extension);

    lambda_extension::run(func).await
}

mod results {
    use std::env;

    use aws_config::BehaviorVersion;
    use aws_sdk_sqs::types::ChangeMessageVisibilityBatchRequestEntry;
    use axum::extract::State;
    use axum::{debug_handler, BoxError, Json};
    use futures::{join, TryFutureExt};
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

        let reporting_request = reporting_sdk::Request {
            handler_id: env::var("HANDLER_ID").expect("HANDLER_ID is not defined"),
            handler_version: env::var("HANDLER_VERSION").expect("HANDLER_VERSION is not defined"),
            stripe_customer_id: env::var("STRIPE_CUSTOMER_ID")
                .expect("STRIPE_CUSTOMER_ID is not defined"),
            user_id: Some(env::var("USER_ID").expect("USER_ID is not defined")),
            invocation_id: payload.invocation_id.clone(),
            results: payload.results.clone(),
        };

        let _ = join!(
            app_state.reporting.handle(&reporting_request),
            maybe_update_process_state(&app_state, &failed_tx),
            maybe_update_message_visibility(&sqs_client, &payload, &failed_tx)
        );

        return Json(json!({"ok": true}));
    }

    async fn maybe_update_process_state(
        app_state: &AppState,
        failed_tx: &Option<TransactionResult>,
    ) -> Result<(), BoxError> {
        match failed_tx {
            Some(failed_tx) => fail_process_state(app_state, &failed_tx).await,
            None => unfail_process_state(app_state).await,
        }
    }

    async fn maybe_update_message_visibility(
        sqs_client: &aws_sdk_sqs::Client,
        request: &Request,
        failed_tx: &Option<TransactionResult>,
    ) -> Result<(), BoxError> {
        if let Some(_) = failed_tx {
            return update_message_visibility(&sqs_client, &request.message_ids).await;
        }

        Ok(())
    }

    async fn update_message_visibility(
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
            .set_error_label(Some(
                failed_tx.failed_label.as_ref().unwrap().label.to_string(),
            ))
            .set_error_tx(Some(failed_tx.transaction_hash.to_string()))
            .send()
            .await?)
    }

    async fn unfail_process_state(app_state: &AppState) -> Result<(), BoxError> {
        let mut state = app_state.pipeline.lock().await;

        Ok(state
            .update()
            .set_error_label(None)
            .set_error_tx(None)
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
