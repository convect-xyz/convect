use std::env;

use aws_sdk_s3::primitives::{ByteStream, SdkBody};
use ingest::{
    api,
    log_fetcher::invocation::{InvocationRequest, InvocationResponse},
    manifest::Manifest,
};
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};

async fn function_handler(
    event: LambdaEvent<InvocationRequest>,
) -> Result<InvocationResponse, Error> {
    let config = aws_config::load_from_env().await;
    let s3_client = aws_sdk_s3::Client::new(&config);
    let manifest = Manifest::from_env().await.unwrap();
    let api = api::Api::new();

    let transactions = match api
        .fetch_transactions()
        .set_manifest(&manifest)
        .set_start_block(event.payload.start_block)
        .set_end_block(event.payload.end_block)
        .send()
        .await
    {
        Ok(txs) => txs,
        Err(_) => todo!(),
    };

    if transactions.is_empty() {
        return Ok(InvocationResponse {
            s3_bucket: None,
            s3_prefix: None,
            size: 0,
        });
    }

    let body = serde_json::to_string(&transactions).unwrap();
    let size = body.len();

    let project_id = env::var("PROJECT_ID").expect("PROJECT_ID is undefined");
    let handler_id = env::var("HANDLER_ID").expect("HANDLER_ID is undefined");
    let key = format!(
        "fetch/{project_id}/{handler_id}/{id}",
        project_id = project_id,
        handler_id = handler_id,
        id = event.payload.id
    );

    s3_client
        .put_object()
        .bucket("ingest-fetch-logs")
        .key(key.clone())
        .body(ByteStream::new(SdkBody::from(body)))
        .send()
        .await
        .expect("Failed to upload logs");

    Ok(InvocationResponse {
        s3_bucket: Some("ingest-fetch-logs".to_string()),
        s3_prefix: Some(key),
        size,
    })
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
