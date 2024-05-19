use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};

use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct Request {
    version: String,
}

#[derive(Serialize)]
struct Response {}

async fn function_handler(event: LambdaEvent<Request>) -> Result<Response, Error> {
    Ok(Response {})
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
