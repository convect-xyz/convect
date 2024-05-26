use axum::{
    routing::{get, post},
    Router,
};
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
    let app = Router::new()
        .route("/results", post(results::handler))
        .route("/pipeline", get(get_pipeline::handler));
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
    use axum::Json;
    use ingest::types::pipeline::Pipeline;
    use serde::Deserialize;
    use serde_json::{json, Value};

    #[derive(Deserialize, Debug)]
    pub struct TransactionResult {
        pub transaction_hash: String,
        pub successful_labels: Vec<String>,
        pub failed_label: Option<String>,
    }

    #[derive(Deserialize)]
    pub struct Request {
        pub message_ids: Vec<String>,
        pub results: Vec<TransactionResult>,
    }

    pub async fn handler(Json(payload): Json<Request>) -> Json<Value> {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let sqs_client = aws_sdk_sqs::Client::new(&config);
        let handler_id = env::var("HANDLER_ID").expect("Handler ID env not set");
        let mut pipeline = Pipeline::load(handler_id);

        let failed_tx = payload.results.iter().find(|v| v.failed_label.is_some());

        if let Some(failed_tx) = failed_tx {
            let _ = pipeline
                .update()
                .set_error_label(failed_tx.failed_label.as_ref().unwrap().to_string())
                .set_error_tx(failed_tx.transaction_hash.to_string())
                .send();

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
            }

            return Json(json!({"ok": true}));
        }

        let _ = pipeline
            .update()
            .set_error_label("".to_string())
            .set_error_tx("".to_string())
            .send();

        return Json(json!({"ok": true}));
    }
}

mod get_pipeline {
    use axum::extract::Json;
    use ingest::types::pipeline::{self, Pipeline};
    use std::env;

    pub async fn handler() -> Json<pipeline::Inner> {
        let handler_id = env::var("HANDLER_ID").expect("Handler ID env not set");
        let pipeline = Pipeline::load(handler_id);

        return Json(pipeline.into_inner());
    }
}
