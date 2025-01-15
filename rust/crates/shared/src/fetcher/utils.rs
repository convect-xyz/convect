use std::cmp::max;
use std::collections::HashMap;
use std::str::FromStr;
use web3::types::{H160, H256, U256};

use crate::fetcher::graphql;
use crate::manifest::{LogConfig, Manifest, TransactionConfig};
use crate::types::transactions::{IngestLog, IngestTransaction};

use super::graphql::example_query::{ExampleQueryLogs, FilterCriteria};

pub fn get_eligible_tx_configs<'a>(
    manifest: &'a Manifest,
    chain_id: u64,
    range_start: u64,
) -> Vec<(TransactionConfig, Vec<LogConfig>)> {
    let is_tx_config_after_start =
        |tx_config: &TransactionConfig| match tx_config.get_start_block(chain_id) {
            Some(tx_cfg_start_block) => range_start >= tx_cfg_start_block,
            None => true,
        };

    let should_run_on_chain = |tx_config: &TransactionConfig| match &tx_config.chains {
        Some(chains) => chains.contains(&(chain_id as i64)),
        None => true,
    };

    manifest
        .get_tx_configs_with_log_configs()
        .into_iter()
        .filter(|(tx_cfg, _)| is_tx_config_after_start(tx_cfg) && should_run_on_chain(tx_cfg))
        .collect()
}

pub fn group_logs_into_transactions(logs: Vec<ExampleQueryLogs>) -> Vec<IngestTransaction> {
    let mut tx_indices: HashMap<String, usize> = HashMap::new();
    let mut txs: Vec<IngestTransaction> = Vec::new();

    let id = uuid::Uuid::new_v4();
    for log in logs.into_iter() {
        let tx_hash = log.transaction.hash.clone();

        if !tx_indices.contains_key(&tx_hash) {
            tx_indices.insert(tx_hash.clone(), txs.len());

            txs.push(IngestTransaction {
                block_number: u64::from_str_radix(
                    log.transaction
                        .block
                        .as_ref()
                        .unwrap()
                        .number
                        .strip_prefix("0x")
                        .unwrap(),
                    16,
                )
                .unwrap(),
                block_timestamp: i64::from_str_radix(
                    log.transaction
                        .block
                        .as_ref()
                        .unwrap()
                        .timestamp
                        .strip_prefix("0x")
                        .unwrap(),
                    16,
                )
                .unwrap(),
                block_hash: log.transaction.block.as_ref().unwrap().hash.clone(),
                transaction_index: u64::from_str_radix(
                    log.transaction.index.unwrap().strip_prefix("0x").unwrap(),
                    16,
                )
                .unwrap(),
                batch_id: id.to_string(),
                transaction_hash: log.transaction.hash.clone(),
                from: log.transaction.from.address.clone(),
                to: log.transaction.to.unwrap().address.clone(),
                value: log.transaction.value.to_string(),
                logs: Vec::new(),
            });
        }

        let tx_index = tx_indices
            .get(&tx_hash)
            .expect(format!("Could not find index for hash {:?}", tx_hash).as_str())
            .clone();
        let transaction = txs.get_mut(tx_index).unwrap();

        transaction.logs.push(IngestLog {
            address: log.account.address,
            topics: log.topics.clone(),
            data: log.data.into(),
            log_index: Some(U256::from_str(log.index.as_str()).unwrap()),
            removed: Some(false),
        });
    }

    txs
}

pub fn remove_extranous_logs(
    manifest: &Manifest,
    chain_id: u64,
    logs: Vec<ExampleQueryLogs>,
) -> Vec<ExampleQueryLogs> {
    let has_matching_log_cfg = |log: &ExampleQueryLogs| {
        manifest.log_configs.iter().any(|log_cfg| {
            let parsed_cfg_address = H160::from_str(log_cfg.address.get_address(chain_id).as_str())
                .expect(
                    format!(
                        "Could not convert to H256: {}",
                        log_cfg.address.get_address(chain_id)
                    )
                    .as_str(),
                );

            let parsed_cfg_topic = H256::from_str(log_cfg.topics[0].as_str())
                .expect(format!("Could not convert to H256: {}", log_cfg.topics[0]).as_str());

            log.account
                .address
                .eq(&format!("{:#x}", parsed_cfg_address))
                && log.topics[0].eq(&format!("{:#x}", parsed_cfg_topic))
        })
    };

    logs.into_iter()
        .filter(|log| has_matching_log_cfg(log))
        .collect()
}

/**
  Returns a Filter that covers all the logs that are relevant to the given range.
  The Filter is constructed by:

  * taking all log config addresses and topics that are relevant to the current range.
  * taking the smallest start block of all the tx_configs as the start block that are relevant to the current range.

  After a response is returned from the web3 client, any extraneous logs that are not relevant to the Manifest should be removed with
  the remove_extranous_logs function.
*/
pub fn get_web3_client_filter(
    tx_configs: &Vec<(TransactionConfig, Vec<LogConfig>)>,
    chain_id: u64,
    range_start: u64,
    range_end: u64,
) -> graphql::example_query::Variables {
    let all_log_configs: Vec<&LogConfig> = tx_configs
        .iter()
        .map(|(_, log_configs)| log_configs)
        .flatten()
        .collect();

    let mut addresses: Vec<H160> = all_log_configs
        .iter()
        .map(|c| H160::from_str(c.address.get_address(chain_id).as_str()).unwrap())
        .collect();
    addresses.sort();
    addresses.dedup();

    let mut topics: Vec<H256> = all_log_configs
        .iter()
        .map(|c| H256::from_str(c.topics[0].as_str()).unwrap())
        .collect();
    topics.sort();
    topics.dedup();

    let smallest_tx_cfg_start_block = tx_configs
        .iter()
        .map(|tx_cfg| tx_cfg.0.get_start_block(chain_id).unwrap_or(0))
        .min()
        .unwrap_or(0);

    let start_block = max(
        u64::try_from(smallest_tx_cfg_start_block).expect("Could not convert to u64"),
        range_start,
    );

    graphql::example_query::Variables {
        filter: FilterCriteria {
            addresses: Some(addresses.into_iter().map(|v| format!("{:#x}", v)).collect()),
            topics: Some(vec![topics
                .into_iter()
                .map(|v| format!("{:#x}", v))
                .collect()]),
            from_block: Some(format!("{:#x}", start_block)),
            to_block: Some(format!("{:#x}", range_end)),
        },
    }
}

// #[cfg(test)]
// mod tests {
//     use super::*;
//     use crate::manifest::Manifest;
//     use crate::{build_log, build_log_config};

//     mod get_eligible_tx_configs {
//         use super::*;

//         #[tokio::test]
//         async fn test_gets_eligible_tx_configs() {
//             // Arrange.
//             let manifest = Manifest {
//                 tx_configs: vec![
//                     TransactionConfig {
//                         chains: None,
//                         start_block: HashMap::from([("1".to_string(), 150)]),
//                     },
//                     TransactionConfig {
//                         chains: None,
//                         start_block: HashMap::from([("1".to_string(), 180)]),
//                     },
//                     TransactionConfig {
//                         chains: None,
//                         start_block: HashMap::from([("1".to_string(), 5)]),
//                     },
//                 ],
//                 log_configs: vec![
//                     build_log_config! {
//                         address = "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002",
//                         topics = vec!["0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62".to_string()],
//                         tx_configs = vec![0]
//                     },
//                     build_log_config! {
//                         address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
//                         topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33".to_string()],
//                         tx_configs = vec![1]
//                     },
//                     build_log_config! {
//                         address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
//                         topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33".to_string()],
//                         tx_configs = vec![2]
//                     },
//                 ],
//             };

//             // Act.
//             let eligible_tx_configs = get_eligible_tx_configs(&manifest, 1, 100);

//             // Assert.
//             assert_eq!(
//                 eligible_tx_configs,
//                 vec![(
//                     manifest.tx_configs[2].clone(),
//                     vec![manifest.log_configs[2].clone()]
//                 )]
//             );
//         }
//     }

//     mod get_web3_client_filter {
//         use super::*;

//         #[tokio::test]
//         async fn test_removes_duplicate_addresses_and_topics() {
//             // Arrange.
//             let manifest = Manifest {
//                 tx_configs: vec![
//                     TransactionConfig {
//                         chains: None,
//                         start_block: HashMap::from([("1".to_string(), 150)]),
//                     },
//                     TransactionConfig {
//                         chains: None,
//                         start_block: HashMap::from([("1".to_string(), 180)]),
//                     },
//                     TransactionConfig {
//                         chains: None,
//                         start_block: HashMap::from([("1".to_string(), 5)]),
//                     },
//                 ],
//                 log_configs: vec![
//                     build_log_config! {
//                         address = "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002",
//                         topics = vec!["0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62".to_string()],
//                         tx_configs = vec![0]
//                     },
//                     build_log_config! {
//                         address = "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002",
//                         topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33".to_string()],
//                         tx_configs = vec![0]
//                     },
//                     build_log_config! {
//                         address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
//                         topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33".to_string()],
//                         tx_configs = vec![1]
//                     },
//                     build_log_config! {
//                         address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
//                         topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33".to_string()],
//                         tx_configs = vec![2]
//                     },
//                 ],
//             };

//             // Act.
//             let web3_filter =
//                 get_web3_client_filter(&manifest.get_tx_configs_with_log_configs(), 1, 0, 1000000);

//             // Assert.
//             assert_eq!(
//                 web3_filter,
//                 FilterBuilder::default()
//                     .address(vec![
//                         H160::from_str("0x8d9088383506437d8De8897B5cF924a2ac70BBDb").unwrap(),
//                         H160::from_str("0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002").unwrap(),
//                     ])
//                     .topics(
//                         Some(vec![
//                           H256::from_str(
//                             "0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33",
//                           )
//                           .unwrap(),
//                           H256::from_str(
//                             "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62",
//                           )
//                           .unwrap(),
//                         ]),
//                         None,
//                         None,
//                         None
//                     )
//                     .from_block(web3::types::BlockNumber::Number(5.into()))
//                     .to_block(web3::types::BlockNumber::Number(1000000.into()))
//                     .build()
//             );
//         }
//     }

//     mod remove_extranous_logs {
//         use super::*;

//         #[tokio::test]
//         async fn test_removes_extranous_logs() {
//             // Arrange.
//             let manifest = Manifest {
//                 tx_configs: vec![],
//                 log_configs: vec![
//                     build_log_config! {
//                         address = "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002",
//                         topics = vec!["0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62"],
//                     },
//                     build_log_config! {
//                         address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
//                         topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33"],
//                     },
//                     build_log_config! {
//                         address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
//                         topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33"],
//                     },
//                 ],
//             };

//             let logs = vec![
//                 build_log! {
//                     address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
//                     topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33"],
//                 },
//                 build_log! {
//                     address = "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002",
//                     topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33"],
//                 },
//             ];

//             let expected_logs = vec![build_log! {
//                 address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
//                 topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33"],
//             }];

//             // Act.
//             let filtered_logs = remove_extranous_logs(&manifest, 1, logs);

//             // Assert.
//             assert_eq!(filtered_logs, expected_logs);
//         }
//     }

//     mod group_logs_into_transactions {
//         use super::*;

//         #[tokio::test]
//         async fn test_groups_logs_into_transactions() {
//             // Arrange.
//             let logs = vec![
//                 build_log! {
//                     address = "0xA0A85A94eB44b171791e0F8bc106c3Ff543d4002",
//                     block_hash = "0x0000000000000000000000000000000000000000000000000000000000000000",
//                     block_number = 150,
//                     topics = vec!["0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62"],
//                     transaction_hash = "0x0000000000000000000000000000000000000000000000000000000000000000",
//                     transaction_index = 0,
//                 },
//                 build_log! {
//                     address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
//                     block_hash = "0x0000000000000000000000000000000000000000000000000000000000000000",
//                     block_number = 180,
//                     topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33"],
//                     transaction_hash = "0x0000000000000000000000000000000000000000000000000000000000000000",
//                     transaction_index = 0,
//                 },
//                 build_log! {
//                     address = "0x8d9088383506437d8De8897B5cF924a2ac70BBDb",
//                     block_hash = "0x1111111111111111111111111111111111111111111111111111111111111111",
//                     block_number = 5,
//                     topics = vec!["0x6b9fc20cbc3e40e447711f4628cc9aa1102e79c7a8388d5f62b33d99cb971b33"],
//                     transaction_hash = "0x1111111111111111111111111111111111111111111111111111111111111111",
//                     transaction_index = 1,
//                 },
//             ];

//             // Act.
//             let grouped_txs = group_logs_into_transactions(logs);

//             // Assert.
//             assert_eq!(grouped_txs.len(), 2);
//             assert_eq!(grouped_txs[0].logs.len(), 2);
//             assert_eq!(grouped_txs[1].logs.len(), 1);
//         }
//     }
// }
