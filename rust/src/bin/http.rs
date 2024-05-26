use std::env;
use std::thread;

use axum::{routing::post, Json, Router};
use ingest::types::pipeline::Pipeline;
use lambda_extension::tracing;
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
    let app = Router::new().route("/results", post(results::post_results));
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
    use std::{env, time::Duration};

    use aws_config::BehaviorVersion;
    use aws_sdk_sqs::types::{
        ChangeMessageVisibilityBatchRequestEntry, ChangeMessageVisibilityBatchResultEntry,
    };
    use axum::Json;
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

    pub async fn post_results(Json(payload): Json<Request>) -> Json<Value> {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let sqs_client = aws_sdk_sqs::Client::new(&config);

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
                            .set_receipt_handle(Some(v))
                            .set_visibility_timeout(Some(120))
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
}
