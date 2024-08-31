#[macro_export]
#[cfg(test)]
macro_rules! build_log_config {
    (
      address = $address:expr,
      topics = $topics:expr,
      tx_configs = $tx_configs:expr
    ) => {
        $crate::manifest::LogConfig {
            address: $crate::manifest::LogOrigin::String($address.to_string()),
            topics: $topics
                .to_vec()
                .into_iter()
                .map(|t| t.to_string())
                .collect(),
            tx_configs: $tx_configs.to_vec(),
        }
    };
    (
        address = $address:expr,
        topics = $topics:expr,
    ) => {
        $crate::manifest::LogConfig {
            address: $crate::manifest::LogOrigin::String($address.to_string()),
            topics: $topics
                .to_vec()
                .into_iter()
                .map(|t| t.to_string())
                .collect(),
            tx_configs: Vec::new(),
        }
    };
}
