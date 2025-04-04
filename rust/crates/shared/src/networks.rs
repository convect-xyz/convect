use crate::configuration::{RefreshingEnvironmentConfig, SupportedNetwork};

pub async fn get_supported_networks() -> Vec<SupportedNetwork> {
    RefreshingEnvironmentConfig::new()
        .await
        .get_config()
        .await
        .chains
        .clone()
}

pub async fn get_supported_network(chain_id: u64) -> Option<SupportedNetwork> {
    return get_supported_networks()
        .await
        .into_iter()
        .find(|n| n.id == chain_id);
}

pub async fn get_first_polling_url(chain_id: u64) -> String {
    return get_supported_network(chain_id)
        .await
        .map(|n| n.polling_urls.first().unwrap().to_string())
        .unwrap();
}
