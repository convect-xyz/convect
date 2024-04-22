use crate::{manifest::Manifest, syncer};
use aws_config::BehaviorVersion;
use serde::{Deserialize, Serialize};
use std::{cmp::Ordering, collections::HashMap, fmt::Debug};
use uuid::Uuid;
use web3::{futures::future::join_all, types::Log};

mod internal;

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct IngestTransaction {
    pub id: String,
    pub block_number: u64,
    pub transaction_index: u64,
    pub transaction_hash: String,
    pub logs: HashMap<String, Vec<Log>>,
}

pub async fn get_ingest_transactions<'a>(
    manifest: &Manifest,
    start_block: u64,
    end_block: u64,
) -> Result<Vec<IngestTransaction>, web3::Error> {
    let futures = manifest.tx_configs.iter().map(|tx_config| {
        internal::get_ingest_transactions(internal::GetTransactionWithLogsRequest {
            start_block,
            end_block,
            tx_config,
        })
    });

    let mut result = join_all(futures)
        .await
        .into_iter()
        .flat_map(|f| f.unwrap().transactions)
        .collect::<Vec<IngestTransaction>>();

    result.sort_by(|a, b| {
        let block_cmp = a.block_number.cmp(&b.block_number);
        if block_cmp == Ordering::Equal {
            return a.transaction_index.cmp(&b.transaction_index);
        }

        return block_cmp;
    });

    Ok(result)
}

pub async fn upload_to_sqs(txs: &Vec<IngestTransaction>) {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let sqs_client = aws_sdk_sqs::Client::new(&config);
    let syncer_config = syncer::load_config_from_env();

    let mut i = 0;
    while i < txs.len() {
        let mut group = Vec::new();
        let mut group_byte_size = 0;

        // Group each entry into max 256kb entries.
        while i < txs.len() {
            let current_tx = &txs[i];

            // check that tx size will not make this entry over 256kb
            let tx_size = serde_json::to_string(current_tx).unwrap().len();
            if tx_size + group_byte_size > 250000 {
                break;
            }

            // add tx size to group size and add tx to group
            group_byte_size += tx_size;
            group.push(current_tx);

            // next result
            i += 1;
        }

        let id = Uuid::new_v4();

        let sqs_res = sqs_client
            .send_message()
            .queue_url(&syncer_config.tx_queue_url)
            .message_body(serde_json::to_string(txs).unwrap())
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
