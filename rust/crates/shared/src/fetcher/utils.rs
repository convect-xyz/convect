use std::collections::HashMap;
use std::str::FromStr;
use web3::types::{H160, H256};

use crate::manifest::Manifest;
use crate::types::transactions::IngestTransaction;

use super::strategy::LogResult;

pub fn group_logs_into_transactions(logs: Vec<LogResult>) -> Vec<IngestTransaction> {
    let mut tx_indices: HashMap<String, usize> = HashMap::new();
    let mut txs: Vec<IngestTransaction> = Vec::new();

    for log_result in logs.into_iter() {
        let tx_hash = log_result.transaction_hash();

        if !tx_indices.contains_key(&tx_hash) {
            tx_indices.insert(tx_hash.clone(), txs.len());

            txs.push(IngestTransaction {
                block_number: log_result.block_number(),
                block_hash: log_result.block_hash(),
                transaction_index: log_result.transaction_index(),
                transaction_hash: log_result.transaction_hash(),
                from: log_result.from(),
                to: log_result.to(),
                value: log_result.value(),
                logs: Vec::new(),
            });
        }

        let tx_index = tx_indices
            .get(&tx_hash)
            .expect(format!("Could not find index for hash {:?}", tx_hash).as_str())
            .clone();
        let transaction = txs.get_mut(tx_index).unwrap();
        transaction.logs.push(log_result.into_ingest_log());
    }

    txs
}

pub fn remove_extranous_logs(
    manifest: &Manifest,
    chain_id: u64,
    logs: Vec<LogResult>,
) -> Vec<LogResult> {
    let has_matching_log_cfg = |log: &LogResult| {
        manifest.log_configs.iter().any(|log_cfg| {
            let parsed_cfg_address =
                H160::from_str(log_cfg.address.get_address(chain_id).unwrap().as_str()).expect(
                    format!(
                        "Could not convert to H256: {}",
                        log_cfg.address.get_address(chain_id).unwrap()
                    )
                    .as_str(),
                );

            let parsed_cfg_topic = H256::from_str(log_cfg.topics[0].as_str())
                .expect(format!("Could not convert to H256: {}", log_cfg.topics[0]).as_str());

            log.address().eq(&format!("{:#x}", parsed_cfg_address))
                && log.topics()[0].eq(&format!("{:#x}", parsed_cfg_topic))
        })
    };

    logs.into_iter()
        .filter(|log| has_matching_log_cfg(log))
        .collect()
}
