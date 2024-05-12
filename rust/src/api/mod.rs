use crate::manifest::Manifest;
use serde::{Deserialize, Serialize};
use std::{
    cmp::Ordering,
    collections::{HashMap, HashSet},
    fmt::Debug,
};
use uuid::Uuid;
use web3::{
    futures::future::join_all,
    types::{Bytes, U256},
};

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
pub struct Batch {
    pub bucket: String,
    pub prefix: String,
}

#[derive(Serialize, Deserialize)]
pub enum SQSPayload {
    Transactions(Vec<IngestTransaction>),
    Batch(Batch),
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
    data: Batch,
}

pub async fn upload_to_sqs(
    sqs_client: &aws_sdk_sqs::Client,
    queue_url: String,
    payload: SQSPayload,
) {
    match payload {
        SQSPayload::Transactions(txs) => {
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
            }
        }
        SQSPayload::Batch(payload) => {
            let prefix = payload.prefix.clone();
            let sqs_res = sqs_client
                .send_message()
                .queue_url(queue_url.to_owned())
                .message_body(
                    serde_json::to_string(&BatchPayload {
                        _type: String::from("batch"),
                        data: payload,
                    })
                    .unwrap(),
                )
                .message_group_id("main")
                .message_deduplication_id(prefix)
                .send()
                .await;

            match sqs_res {
                Ok(_) => {}
                Err(e) => panic!("Upload Result: {:?}", e),
            }
        }
    }
}
