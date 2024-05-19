use ingest::types::pipeline::{Pipeline, SyncState};
use lambda_http::{run, service_fn, tracing, Body, Error, IntoResponse, Request, Response};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct RequestBody {
    #[serde(rename = "handlerId")]
    handler_id: String,
}

#[derive(Serialize, Deserialize)]
struct RequestResponse {
    #[serde(rename = "handlerId")]
    handler_id: String,
    #[serde(rename = "state")]
    state: SyncState,
    #[serde(rename = "lastBlock")]
    last_block: Option<u64>,
    #[serde(rename = "transactionCount")]
    transaction_count: u64,
    #[serde(rename = "processedTransactionsCount")]
    processed_transactions_count: u64,
}

async fn function_handler(event: Request) -> Result<impl IntoResponse, Error> {
    let body: RequestBody = match event.body() {
        Body::Text(content) => {
            let body: RequestBody = serde_json::from_str(content).unwrap();
            body
        }
        _ => panic!("Could not get text content"),
    };

    let mut pipeline = Pipeline::load(body.handler_id);

    let resp = Response::builder()
        .header("Content-Type", "application/json")
        .body(
            serde_json::to_string(&RequestResponse {
                handler_id: pipeline.handler_id(),
                state: pipeline.state(),
                last_block: pipeline.last_block(),
                transaction_count: pipeline.get_transaction_count(),
                processed_transactions_count: pipeline.get_processed_transaction_count(),
            })
            .unwrap(),
        )
        .map_err(Box::new)?;

    Ok(resp)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
