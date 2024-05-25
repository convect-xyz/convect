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
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();

    let app = Router::new().route("/results", post(results::post_results));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:4121")
        .await
        .unwrap();

    let func = service_fn(my_extension);

    thread::spawn(|| async {
        axum::serve(listener, app).await.unwrap();
    });

    lambda_extension::run(func).await
}

mod results {
    use axum::Json;
    use serde::Deserialize;

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

    pub async fn post_results(Json(payload): Json<Request>) {
        println!("{:?}", payload.results);
    }
}
