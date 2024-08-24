#[macro_export]
#[cfg(test)]
/// The order of the fields is in alphabetical order as follows:
/// * address
/// * block_hash
/// * block_number
/// * data
/// * log_index
/// * log_type
/// * topics
/// * transaction_hash
/// * transaction_index
/// * transaction_log_index
/// * removed
macro_rules! build_log {
    (
        $(address = $address:expr,)?
        $(block_hash = $block_hash:expr,)?
        $(block_number = $block_number:expr,)?
        $(data = $data:expr,)?
        $(log_index = $log_index:expr,)?
        $(log_type = $log_type:expr,)?
        $(topics = $topics:expr,)?
        $(transaction_hash = $transaction_hash:expr,)?
        $(transaction_index = $transaction_index:expr,)?
        $(transaction_log_index = $transaction_log_index:expr,)?
        $(removed = $removed:expr,)?
    ) => {{
        let mut log = web3::types::Log {
            address: web3::types::H160::zero(),
            topics: Vec::new(),
            data: web3::types::Bytes(Vec::new()),
            block_hash: None,
            block_number: None,
            transaction_hash: None,
            transaction_index: None,
            log_index: None,
            transaction_log_index: None,
            log_type: None,
            removed: Some(false),
        };

        $(
          log.address = web3::types::H160::from_str($address).expect("Invalid address format");
        )?
        $(
          log.topics = $topics.into_iter()
            .map(|t| web3::types::H256::from_str(&t).expect("Invalid topic format"))
            .collect();
        )?
        $(
          log.data = Some($data.into());
        )?
        $(
          log.block_hash = Some(web3::types::H256::from_str($block_hash).expect("Invalid block hash format"));
        )?
        $(
          log.block_number = Some(web3::types::U64::from($block_number));
        )?
        $(
          log.transaction_hash = Some(web3::types::H256::from_str($transaction_hash).expect("Invalid transaction hash format"));
        )?
        $(
          log.transaction_index = Some(web3::types::U64::from($transaction_index));
        )?
        $(
          log.log_index = Some(web3::types::U256::from($log_index));
        )?
        $(
          log.transaction_log_index = Some(web3::types::U64::from($transaction_log_index));
        )?
        $(
          log.log_type = $log_type;
        )?
        $(
          log.removed = $removed;
        )?

        log
    }};
}
