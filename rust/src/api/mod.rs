use crate::{manifest::Manifest, syncer::Pipeline};
use aws_sdk_s3::primitives::ByteStream;
use aws_smithy_types::body::SdkBody;
use serde::{Deserialize, Serialize};
use std::{cmp::Ordering, fmt::Debug};
use uuid::Uuid;
use web3::types::{Bytes, U256};

mod internal;

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct IngestTransaction {
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    #[serde(rename = "blockHash")]
    pub block_hash: String,
    #[serde(rename = "transactionIndex")]
    pub transaction_index: u64,
    #[serde(rename = "transactionHash")]
    pub transaction_hash: String,
    pub logs: Vec<IngestLog>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct IngestLog {
    pub address: String,
    pub topics: Vec<String>,
    pub data: Bytes,
    #[serde(rename = "logIndex")]
    pub log_index: Option<U256>,
    pub removed: Option<bool>,
}

pub async fn get_ingest_transactions<'a>(
    manifest: &Manifest,
    start_block: u64,
    end_block: u64,
) -> Result<Vec<IngestTransaction>, web3::Error> {
    let mut transactions =
        internal::get_ingest_transactions(start_block, end_block, &manifest.log_configs)
            .await
            .unwrap();

    transactions.sort_by(|a, b| {
        let block_cmp = a.block_number.cmp(&b.block_number);
        if block_cmp == Ordering::Equal {
            return a.transaction_index.cmp(&b.transaction_index);
        }

        return block_cmp;
    });

    Ok(transactions)
}

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

pub async fn upload_transactions(
    pipeline: &Pipeline,
    sqs_client: &aws_sdk_sqs::Client,
    s3_client: &aws_sdk_s3::Client,
    queue_url: String,
    txs: Vec<IngestTransaction>,
) {
    let serialised_txs = serde_json::to_string(&txs).unwrap();

    if serialised_txs.len() > 1024 * 1024 * 2 {
        return upload_small(pipeline, sqs_client, queue_url, txs).await;
    }

    return upload_batch(pipeline, sqs_client, s3_client, queue_url, txs).await;
}

async fn upload_small(
    pipeline: &Pipeline,
    sqs_client: &aws_sdk_sqs::Client,
    queue_url: String,
    txs: Vec<IngestTransaction>,
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

        let sqs_res = sqs_client
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
            .update()
            .set_last_block(group.last().unwrap().block_number)
            .send()
            .await
            .unwrap();
    }
}

async fn upload_batch(
    pipeline: &Pipeline,
    sqs_client: &aws_sdk_sqs::Client,
    s3_client: &aws_sdk_s3::Client,
    queue_url: String,
    txs: Vec<IngestTransaction>,
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

        let response = s3_client
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

        let sqs_res = sqs_client
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

        pipeline
            .update()
            .set_last_block(batch.last().unwrap().block_number)
            .send()
            .await
            .unwrap();
    }
}
