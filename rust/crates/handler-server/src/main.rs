use axum::{
    routing::{get, post},
    Router,
};
use config::HandlerServerConfig;
use lambda_extension::{service_fn, tracing, Error, LambdaEvent, NextEvent};
use monitoring::init_sentry;
use state::AppState;
use tower_http::trace::TraceLayer;

mod config;
mod errors;
mod monitoring;
mod state;

async fn my_extension(event: LambdaEvent) -> Result<(), Error> {
    match event.next {
        NextEvent::Shutdown(_e) => {}
        NextEvent::Invoke(_e) => {}
    }
    Ok(())
}

fn main() -> Result<(), Error> {
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            _main().await;
            let func = service_fn(my_extension);
            lambda_extension::run(func).await
        })
        .unwrap();

    Ok(())
}

async fn _main() -> Result<(), Error> {
    println!("main initialised");
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .with_target(false)
        .without_time()
        .with_ansi(false)
        .init();

    println!("loading app state");
    let app_state = AppState::new().await;

    println!("initialising sentry");
    let _guard = init_sentry(&app_state.handler_server_config);

    let app = Router::new()
        .route("/results", post(results::handler))
        .route("/pipeline", get(get_pipeline::handler))
        .with_state(app_state)
        .layer(TraceLayer::new_for_http());

    println!("binding to port");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:4121").await.unwrap();

    tokio::spawn(async {
        println!("Starting server");
        axum::serve(listener, app).await.unwrap();
    });

    Ok(())
}

mod results {
    use super::errors::ServerError;
    use crate::AppState;

    use aws_sdk_sqs::types::ChangeMessageVisibilityBatchRequestEntry;
    use axum::extract::State;
    use axum::{debug_handler, BoxError, Json};
    use futures::{join, TryFutureExt};
    use serde::Deserialize;
    use serde_json::{json, Value};
    use shared::reporting_sdk::{self, ProcessedBatchResult};

    #[derive(Deserialize, Debug)]
    pub struct Request {
        pub invocation_id: String,
        pub results: Vec<reporting_sdk::ProcessedBatchResult>,
    }

    #[debug_handler]
    pub async fn handler(
        State(app_state): State<AppState>,
        Json(payload): Json<Request>,
    ) -> Result<Json<Value>, ServerError> {
        let failed_batch: Option<ProcessedBatchResult> = payload
            .results
            .iter()
            .find(|v| v.status.eq(&reporting_sdk::BatchStatus::Failure))
            .map(|v| v.clone());

        let reporting_request = reporting_sdk::Report::Results {
            function_id: app_state.handler_server_config.function_id.clone(),
            chain_id: app_state.handler_server_config.chain_id.to_string(),
            project_id: app_state.handler_server_config.project_id.clone(),
            deployment_id: app_state.handler_server_config.deployment_id.clone(),
            invocation_id: payload.invocation_id.clone(),
            results: payload.results.clone(),
        };

        let (reporting_result, process_result, visibility_result) = join!(
            app_state.reporting.handle(&reporting_request),
            maybe_update_process_state(&app_state, &failed_batch),
            maybe_update_message_visibility(&app_state, &failed_batch)
        );

        reporting_result?;
        process_result?;
        visibility_result?;

        Ok(Json(json!({"ok": true})))
    }

    async fn maybe_update_process_state(
        app_state: &AppState,
        failed_batch: &Option<ProcessedBatchResult>,
    ) -> Result<(), BoxError> {
        if let Some(failed_batch) = failed_batch {
            return fail_process_state(app_state, &failed_batch).await;
        }

        return unfail_process_state(app_state).await;
    }

    async fn maybe_update_message_visibility(
        app_state: &AppState,
        failed_tx: &Option<ProcessedBatchResult>,
    ) -> Result<(), BoxError> {
        if let Some(failed_tx) = failed_tx {
            return update_message_visibility(app_state, &failed_tx.message_id).await;
        }

        Ok(())
    }

    async fn update_message_visibility(
        app_state: &AppState,
        message_ids: &String,
    ) -> Result<(), BoxError> {
        Ok(app_state
            .sqs_client
            .change_message_visibility_batch()
            .set_queue_url(Some(
                app_state
                    .handler_server_config
                    .transaction_queue_url
                    .clone(),
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
        batch_result: &ProcessedBatchResult,
    ) -> Result<(), BoxError> {
        let mut state = app_state.pipeline.lock().await;

        Ok(state
            .update()
            .set_error_batch_id(Some(batch_result.batch_id.clone()))
            .send()
            .await?)
    }

    async fn unfail_process_state(app_state: &AppState) -> Result<(), BoxError> {
        let mut state = app_state.pipeline.lock().await;

        Ok(state.update().set_error_batch_id(None).send().await?)
    }
}

mod get_pipeline {
    use std::collections::HashMap;

    use axum::extract::{Json, State};

    use crate::AppState;

    pub async fn handler(State(app_state): State<AppState>) -> Json<HashMap<String, String>> {
        let process_state = app_state.pipeline.lock().await;

        let mut response = HashMap::new();

        response.insert("functionId".to_string(), process_state.function_id());
        response.insert("chainId".to_string(), process_state.chain_id().to_string());
        response.insert("deploymentId".to_string(), process_state.deployment_id());
        response.insert(
            "errorBatchId".to_string(),
            process_state.error_batch_id().unwrap_or_default(),
        );

        return Json(response);
    }
}
