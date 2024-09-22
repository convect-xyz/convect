use std::env;

use crate::syncing::State;
use crate::types::transactions::IngestTransaction;
use crate::{redis_client::RedisClient, s3::S3};
use futures::Future;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
struct TxPayload {
    #[serde(rename(serialize = "type"))]
    _type: String,
    data: Vec<IngestTransaction>,
}

#[derive(Serialize, Deserialize)]
struct BatchPayload {
    #[serde(rename(serialize = "type"))]
    _type: String,
    download_url: String,
}

pub trait TransactionEnqueuer {
    fn enqueue_transactions<R: RedisClient>(
        &self,
        pipeline: &mut State<R>,
        txs: &Vec<IngestTransaction>,
    ) -> impl Future<Output = Result<(), errors::TransactionEnqueuerError>>;
}

pub struct SQSTransactionEnqueuer<T: S3> {
    sqs_client: aws_sdk_sqs::Client,
    queue_url: String,
    s3_client: T,
}

impl<T: S3> SQSTransactionEnqueuer<T> {
    pub fn new(s3_client: T, queue_url: String, sqs_client: aws_sdk_sqs::Client) -> Self {
        Self {
            s3_client,
            queue_url,
            sqs_client,
        }
    }

    async fn upload_raw<R: RedisClient>(
        &self,
        pipeline: &mut State<R>,
        queue_url: String,
        txs: &Vec<IngestTransaction>,
    ) {
        let mut i = 0;
        while i < txs.len() {
            let mut group = Vec::new();
            let mut group_byte_size = 0;

            // Group each entry into max 256kb entries.
            while i < txs.len() {
                let current_tx = &txs[i];

                // check that tx size will not make this entry over 256kb
                let tx_size = serde_json::to_string(current_tx).unwrap().len();
                if tx_size + group_byte_size > 20000 {
                    break;
                }

                // add tx size to group size and add tx to group
                group_byte_size += tx_size;
                group.push(current_tx.clone());

                // next result
                i += 1;
            }

            let id = Uuid::new_v4();

            let sqs_res = self
                .sqs_client
                .send_message()
                .queue_url(queue_url.to_owned())
                .message_body(
                    serde_json::to_string(&TxPayload {
                        _type: String::from("non-batch"),
                        data: group.clone(),
                    })
                    .unwrap(),
                )
                .message_group_id("main")
                .message_deduplication_id(id)
                .send()
                .await;

            match sqs_res {
                Ok(_) => {}
                Err(e) => panic!("Upload Result: {:?}", e),
            }

            pipeline
                .increment_transaction_count(group.len())
                .await
                .unwrap();
        }
    }

    async fn upload_batch<R: RedisClient>(
        &self,
        pipeline: &mut State<R>,
        queue_url: String,
        txs: &Vec<IngestTransaction>,
    ) {
        let mut i = 0;
        while i < txs.len() {
            let mut batch = Vec::new();

            // Max transactions per batch: 60
            while i < txs.len() && batch.len() < 10 {
                let s3_result = &txs[i];
                batch.push(s3_result);
                i += 1;
            }

            let id = uuid::Uuid::new_v4();

            let bucket = "ingest-fetch-logs";
            let key = format!(
                "syncs/{function_id}/{id}",
                function_id = env::var("FUNCTION_ID").expect("FUNCTION ID not defined"),
            );

            let response = self
                .s3_client
                .put_s3_object(
                    "ingest-fetch-logs",
                    key.as_str(),
                    serde_json::to_string(&batch).unwrap(),
                )
                .await;

            match response {
                Ok(_) => {}
                Err(e) => panic!("Error uploading response: {:?}", e),
            }

            let download_url = format!(
                "https://{bucket}.s3.{region}.amazonaws.com/{key}",
                bucket = bucket,
                region = "eu-west-1",
                key = key
            );

            let sqs_res = self
                .sqs_client
                .send_message()
                .queue_url(queue_url.to_owned())
                .message_body(
                    serde_json::to_string(&BatchPayload {
                        _type: String::from("batch"),
                        download_url: download_url.clone(),
                    })
                    .unwrap(),
                )
                .message_group_id("main")
                .message_deduplication_id(key)
                .send()
                .await;

            match sqs_res {
                Ok(_) => {}
                Err(e) => panic!("Upload Result: {:?}", e),
            }

            pipeline
                .increment_transaction_count(batch.len())
                .await
                .unwrap();
        }
    }
}

impl<T: S3> TransactionEnqueuer for SQSTransactionEnqueuer<T> {
    #[tracing::instrument(skip_all, err)]
    async fn enqueue_transactions<R: RedisClient>(
        &self,
        state: &mut State<R>,
        txs: &Vec<IngestTransaction>,
    ) -> Result<(), errors::TransactionEnqueuerError> {
        let serialised_txs = serde_json::to_string(&txs).unwrap();

        if serialised_txs.len() < 100000 {
            return Ok(self.upload_raw(state, self.queue_url.clone(), txs).await);
        }

        return Ok(self.upload_batch(state, self.queue_url.clone(), txs).await);
    }
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum TransactionEnqueuerError {
        #[error("Failed to upload transactions: {0}")]
        Web3ClientError(#[from] crate::web3_client::errors::Web3ClientError),
    }
}
