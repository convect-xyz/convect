use std::env;

use ingest::{
    api::{
        self,
        enqueuer::TransactionEnqueuerImpl,
        fetcher::{TransactionFetcherImpl, Web3ClientImpl},
        Api,
    },
    log_fetcher_sdk::{InvocationRequest, InvocationResponse},
    s3::S3,
    types::manifest::Manifest,
};
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};

type ApiInstance =
    Api<TransactionFetcherImpl<Web3ClientImpl>, TransactionEnqueuerImpl<aws_sdk_s3::Client>>;

async fn function_handler(
    event: LambdaEvent<InvocationRequest>,
) -> Result<InvocationResponse, Error> {
    let config = aws_config::load_from_env().await;
    let s3_client = aws_sdk_s3::Client::new(&config);
    let manifest = Manifest::from_env().await.unwrap();
    let api: ApiInstance = api::Api::new(&config);
    let s3_bucket = env::var("S3_BUCKET").expect("S3_BUCKET is not set");

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
        return Ok(InvocationResponse::NoTransactions);
    }

    let body = serde_json::to_string(&transactions).unwrap();
    let size = body.len();

    let handler_id = env::var("HANDLER_ID").expect("HANDLER_ID is undefined");
    let key = format!(
        "fetch/{handler_id}/{id}",
        handler_id = handler_id,
        id = event.payload.id
    );

    s3_client
        .put_s3_object(&s3_bucket, key.as_str(), body)
        .await
        .unwrap();

    Ok(InvocationResponse::Transactions {
        s3_bucket,
        s3_prefix: key,
        size,
    })
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
