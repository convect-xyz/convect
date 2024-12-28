use serde::Deserialize;

#[derive(Deserialize, Debug, Clone)]
pub struct SupportedNetwork {
    pub id: u64,
    pub name: String,
    pub polling_urls: Vec<String>,
    pub ws_url: String,
    pub sns_topic: String,
    pub etherscan_api_key: String,
    pub etherscan_like: String,
}

const CHAINS_JSON: &str = include_str!("../../../../config/chains.json");

pub fn get_supported_networks() -> Vec<SupportedNetwork> {
    let networks: Vec<SupportedNetwork> = serde_json::from_str(CHAINS_JSON).unwrap();
    return networks;
}

pub fn get_supported_network(chain_id: u64) -> Option<SupportedNetwork> {
    return get_supported_networks()
        .into_iter()
        .find(|n| n.id == chain_id);
}

pub fn get_first_polling_url(chain_id: u64) -> String {
    return get_supported_network(chain_id)
        .map(|n| n.polling_urls.first().unwrap().to_string())
        .unwrap();
}
