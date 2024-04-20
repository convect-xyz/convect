use std::io::Read;

use aws_sdk_s3::primitives::{ByteStream, SdkBody};
use ingest::{
    api,
    log_fetcher::invocation::{InvocationRequest, InvocationResponse},
    manifest::Manifest,
    proto::IngestPayload,
};
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};
use prost::bytes::{Bytes, BytesMut};

async fn function_handler(
    event: LambdaEvent<InvocationRequest>,
) -> Result<InvocationResponse, Error> {
    let config = aws_config::load_from_env().await;
    let s3_client = aws_sdk_s3::Client::new(&config);
    let manifest = Manifest::from_env().await.unwrap();

    let transactions = match api::get_ingest_transactions(api::GetIngestTransactionsRequest {
        manifest: &manifest,
        start_block: event.payload.start_block,
        end_block: event.payload.end_block,
    })
    .await
    {
        Ok(txs) => txs,
        Err(_) => todo!(),
    };

    if transactions.is_empty() {
        return Ok(InvocationResponse {
            s3_bucket: None,
            s3_prefix: None,
        });
    }

    let payload = IngestPayload { transactions };

    let buffer = &mut BytesMut::new();
    prost::Message::encode(&payload, buffer)?;

    s3_client
        .put_object()
        .bucket("ingest-fetch-logs")
        .key(event.payload.id.to_string())
        .body(ByteStream::new(SdkBody::from(prost::bytes::Bytes::from(
            buffer.bytes().map(|b| b.unwrap()).collect::<Vec<_>>(),
        ))))
        .send()
        .await
        .expect("Failed to upload logs");

    Ok(InvocationResponse {
        s3_bucket: Some("ingest-fetch-logs".to_string()),
        s3_prefix: Some(event.payload.id.to_string()),
    })
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
