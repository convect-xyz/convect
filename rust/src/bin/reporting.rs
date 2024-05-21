use std::{collections::HashMap, env};

use ingest::types::pipeline::Pipeline;
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};

use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Debug)]
struct Payload {
    handler_id: String,
    transaction_hash: String,
    labels: String,
}

#[derive(Deserialize, Debug)]
struct Request {
    #[serde(rename = "transactions")]
    transactions: HashMap<String, Vec<String>>,
}

#[derive(Serialize)]
struct Response {}

async fn function_handler(event: LambdaEvent<Request>) -> Result<Response, Error> {
    let handler_id = env::var("HANDLER_ID").expect("Handler ID");
    let mut pipeline = Pipeline::load(handler_id.clone());

    let payload = &event.payload;

    pipeline.increment_processed_transaction_count(payload.transactions.len().try_into().unwrap());

    let records: Vec<String> = event
        .payload
        .transactions
        .into_iter()
        .map(|entry| {
            serde_json::to_string(&Payload {
                handler_id: handler_id.clone(),
                transaction_hash: entry.0,
                labels: serde_json::to_string(&entry.1).unwrap(),
            })
            .unwrap()
        })
        .collect();

    let client = Client::new();
    let res = client.post("https://api.eu-central-1.aws.tinybird.co/v0/events?name=convect_transactions")
      .header("Authorization", "Bearer p.eyJ1IjogIjJlYjlhNzU2LWFjMDMtNDJmOC1iNGY2LWI2M2RhN2JiMjkyNiIsICJpZCI6ICJjZTE2YmI1Yi04NDBiLTQwNGMtYjk4Yi0zMjJiNDc4ZDMyYWEiLCAiaG9zdCI6ICJhd3MtZXUtY2VudHJhbC0xIn0.1Bvj9OA-NZQ0cU62T1sweLScNLMPsv8FIGaP8nkHoRw")
      .body(records.join("\n"))
      .send();

    match res {
        Ok(res) => println!("Successfully uploaded: {:?}", res.text()),
        Err(e) => println!("Error: {:?}", e),
    }

    Ok(Response {})
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
