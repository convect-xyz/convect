use axum::{
    routing::{get, post},
    Router,
};
use lambda_extension::{service_fn, tracing, Error, LambdaEvent, NextEvent};
use sentry::protocol::Context;
use shared::{
    processing,
    redis_client::RedisClientImpl,
    reporting_sdk::{ReportingSdk, SQSReportingSdk},
};
use std::collections::BTreeMap;
use std::{env, sync::Arc};
use tokio::sync::Mutex;
use tower_http::trace::TraceLayer;

mod errors;

#[derive(Clone)]
struct AppState {
    pipeline: Arc<Mutex<processing::State>>,
    reporting: Arc<dyn ReportingSdk + Send + Sync>,
    config: Config,
}

async fn my_extension(event: LambdaEvent) -> Result<(), Error> {
    match event.next {
        NextEvent::Shutdown(_e) => {}
        NextEvent::Invoke(_e) => {}
    }
    Ok(())
}

#[derive(Clone)]
struct Config {
    deployment_id: String,
    function_id: String,
    chain_id: u64,
    project_id: i32,
    transaction_queue_url: String,
}

fn configure_sentry_scope(config: &Config) {
    sentry::configure_scope(|scope| {
        scope.set_user(Some(sentry::User {
            id: Some(config.project_id.to_string()),
            ..Default::default()
        }));

        let mut deployment_map = BTreeMap::new();
        deployment_map.insert(
            "deployment_id".to_string(),
            config.deployment_id.clone().into(),
        );
        deployment_map.insert("function_id".to_string(), config.function_id.clone().into());

        scope.set_context("deployment", Context::Other(deployment_map));
    });
}

fn main() -> Result<(), Error> {
    let _guard = sentry::init(("https://c749dc7d2929977538ed3abbd4fbdb4a@o4507692210454528.ingest.de.sentry.io/4507692217729104", sentry::ClientOptions {
        release: sentry::release_name!(),
        ..Default::default()
    }));

    let config = Config {
        deployment_id: env::var("DEPLOYMENT_ID").expect("DEPLOYMENT_ID is not defined"),
        function_id: env::var("FUNCTION_ID").expect("FUNCTION_ID is not defined"),
        chain_id: env::var("CHAIN_ID")
            .expect("CHAIN_ID is not defined")
            .parse()
            .unwrap(),
        project_id: env::var("PROJECT_ID")
            .expect("PROJECT_ID is not defined")
            .parse()
            .unwrap(),
        transaction_queue_url: env::var("TRANSACTION_QUEUE_URL")
            .expect("TRANSACTION_QUEUE_URL is not defined"),
    };

    configure_sentry_scope(&config);

    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async move {
            let function_id = config.function_id.clone();
            let chain_id = config.chain_id.clone();
            let deployment_id = config.deployment_id.clone();

            let pipeline = Arc::new(Mutex::new(
                processing::State::load(function_id, chain_id, deployment_id).await,
            ));
            let reporting_sdk = SQSReportingSdk::new_with_defaults().await;
            let app_state = AppState {
                pipeline,
                reporting: Arc::new(reporting_sdk),
                config,
            };

            tracing_subscriber::fmt()
                .with_max_level(tracing::Level::DEBUG)
                .with_target(false)
                .without_time()
                .with_ansi(false)
                .init();

            let app = Router::new()
                .route("/results", post(results::handler))
                .route("/pipeline", get(get_pipeline::handler))
                .with_state(app_state)
                .layer(TraceLayer::new_for_http());

            let listener = tokio::net::TcpListener::bind("0.0.0.0:4121").await.unwrap();

            tokio::spawn(async {
                println!("Starting server");

                axum::serve(listener, app).await.unwrap();
            });

            let func = service_fn(my_extension);

            lambda_extension::run(func).await
        })
}

mod results {
    use super::errors::ServerError;
    use crate::{AppState, Config};
    use aws_config::BehaviorVersion;
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
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let sqs_client = aws_sdk_sqs::Client::new(&config);

        let failed_tx = payload
            .results
            .iter()
            .find(|v| v.failed_label.is_some())
            .map(|v| v.clone());

        let reporting_request = reporting_sdk::Report::Results {
            function_id: app_state.config.function_id.clone(),
            chain_id: app_state.config.chain_id.to_string(),
            project_id: app_state.config.project_id.clone(),
            invocation_id: payload.invocation_id.clone(),
            results: payload.results.clone(),
            deployment_id: app_state.config.deployment_id.clone(),
        };

        let (reporting_result, process_result, visibility_result) = join!(
            app_state.reporting.handle(&reporting_request),
            maybe_update_process_state(&app_state, &failed_tx),
            maybe_update_message_visibility(&sqs_client, &payload, &failed_tx, &app_state.config)
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
        sqs_client: &aws_sdk_sqs::Client,
        request: &Request,
        failed_tx: &Option<TransactionResult>,
        config: &Config,
    ) -> Result<(), BoxError> {
        if let Some(_) = failed_tx {
            return update_message_visibility(config, &sqs_client, &request.message_ids).await;
        }

        Ok(())
    }

    async fn update_message_visibility(
        config: &Config,
        sqs_client: &aws_sdk_sqs::Client,
        message_ids: &Vec<String>,
    ) -> Result<(), BoxError> {
        Ok(sqs_client
            .change_message_visibility_batch()
            .set_queue_url(Some(config.transaction_queue_url.clone()))
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
