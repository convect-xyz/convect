use std::env;

use ingest::types::pipeline::Pipeline;
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};

use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug)]
struct Request {
    #[serde(rename = "processedTransactionsCount")]
    processed_transactions_count: u64,
}

#[derive(Serialize)]
struct Response {}

async fn function_handler(event: LambdaEvent<Request>) -> Result<Response, Error> {
    let handler_id = env::var("HANDLER_ID").expect("Handler ID");
    let mut pipeline = Pipeline::load(handler_id);

    pipeline.increment_processed_transaction_count(event.payload.processed_transactions_count);

    Ok(Response {})
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
