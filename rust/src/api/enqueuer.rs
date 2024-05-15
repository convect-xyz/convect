use crate::types::pipeline::Pipeline;
use crate::types::transactions::IngestTransaction;
use aws_config::BehaviorVersion;
use aws_sdk_s3::primitives::ByteStream;
use aws_smithy_types::body::SdkBody;
use serde::{Deserialize, Serialize};
use tokio::runtime::Handle;
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
    fn enqueue_transactions<'a>(
        &self,
        pipeline: &mut Pipeline,
        queue_url: String,
        txs: &'a Vec<IngestTransaction>,
    ) -> impl std::future::Future<Output = Result<(), web3::Error>> + Send;
}

pub struct TransactionEnqueuerImpl {
    sqs_client: aws_sdk_sqs::Client,
    s3_client: aws_sdk_s3::Client,
}

impl TransactionEnqueuerImpl {
    pub fn new() -> Self {
        let config =
            Handle::current().block_on(aws_config::load_defaults(BehaviorVersion::latest()));
        let s3_client = aws_sdk_s3::Client::new(&config);
        let sqs_client = aws_sdk_sqs::Client::new(&config);

        Self {
            s3_client,
            sqs_client,
        }
    }

    async fn upload_raw(
        &self,
        pipeline: &mut Pipeline,
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
                if tx_size + group_byte_size > 230000 {
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

            pipeline.increment_transaction_count(group.len());
        }
    }

    async fn upload_batch(
        &self,
        pipeline: &mut Pipeline,
        queue_url: String,
        txs: &Vec<IngestTransaction>,
    ) {
        let mut i = 0;
        while i < txs.len() {
            let mut batch = Vec::new();

            // Max transactions per batch: 60
            while i < txs.len() && batch.len() < 60 {
                let s3_result = &txs[i];
                batch.push(s3_result);
                i += 1;
            }

            let id = uuid::Uuid::new_v4();

            let bucket = "ingest-fetch-logs";
            let key = format!("syncs/batch-{}", id);

            let response = self
                .s3_client
                .put_object()
                .bucket("ingest-fetch-logs")
                .key(key.to_string())
                .body(ByteStream::new(SdkBody::from(
                    serde_json::to_string(&batch).unwrap(),
                )))
                .send()
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
                .message_deduplication_id(download_url)
                .send()
                .await;

            match sqs_res {
                Ok(_) => {}
                Err(e) => panic!("Upload Result: {:?}", e),
            }

            pipeline.increment_transaction_count(batch.len());
        }
    }
}

impl TransactionEnqueuer for TransactionEnqueuerImpl {
    async fn enqueue_transactions(
        &self,
        pipeline: &mut Pipeline,
        queue_url: String,
        txs: &Vec<IngestTransaction>,
    ) -> Result<(), web3::Error> {
        let serialised_txs = serde_json::to_string(&txs).unwrap();

        if serialised_txs.len() < 1024 * 1024 * 2 {
            return Ok(self.upload_raw(pipeline, queue_url, txs).await);
        }

        return Ok(self.upload_batch(pipeline, queue_url, txs).await);
    }
}
