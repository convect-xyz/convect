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

    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();

    let func = service_fn(my_extension);

    lambda_extension::run(func).await
}

mod results {
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
        pub results: Vec<TransactionResult>,
    }

    pub async fn post_results(Json(payload): Json<Request>) -> Json<Value> {
        println!("{:?}", payload.results);

        return Json(json!({"ok": true}));
    }
}
