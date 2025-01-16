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
    use shared::reporting_sdk::{self, TransactionResult};

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
    ) -> Result<Json<Value>, ServerError> {
        let failed_tx = payload
            .results
            .iter()
            .find(|v| v.failed_label.is_some())
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
            maybe_update_process_state(&app_state, &failed_tx),
            maybe_update_message_visibility(&app_state, &payload, &failed_tx,)
        );

        reporting_result?;
        process_result?;
        visibility_result?;

        Ok(Json(json!({"ok": true})))
    }

    async fn maybe_update_process_state(
        app_state: &AppState,
        failed_tx: &Option<TransactionResult>,
    ) -> Result<(), BoxError> {
        if let Some(failed_tx) = failed_tx {
            return fail_process_state(app_state, &failed_tx).await;
        }

        return unfail_process_state(app_state).await;
    }

    async fn maybe_update_message_visibility(
        app_state: &AppState,
        request: &Request,
        failed_tx: &Option<TransactionResult>,
    ) -> Result<(), BoxError> {
        if let Some(_) = failed_tx {
            return update_message_visibility(app_state, &request.message_ids).await;
        }

        Ok(())
    }

    async fn update_message_visibility(
        app_state: &AppState,
        message_ids: &Vec<String>,
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
    use std::collections::HashMap;

    use axum::extract::{Json, State};

    use crate::AppState;

    pub async fn handler(State(app_state): State<AppState>) -> Json<HashMap<String, String>> {
        let process_state = app_state.pipeline.lock().await;

        let mut response = HashMap::new();

        response.insert("FunctionId_".to_string(), process_state.function_id());
        response.insert("ChainId_".to_string(), process_state.chain_id().to_string());
        response.insert("DeploymentId_".to_string(), process_state.deployment_id());
        response.insert(
            "ErrorLabel_".to_string(),
            process_state.error_label().unwrap_or_default(),
        );
        response.insert(
            "ErrorTx_".to_string(),
            process_state.error_tx().unwrap_or_default(),
        );

        return Json(response);
    }
}
