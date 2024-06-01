use serde::Deserialize;

#[derive(Deserialize)]
pub struct SupportedNetwork {
    pub name: String,
    pub polling_url: String,
    pub ws_url: String,
    pub sns_topic: String,
}

const CHAINS_JSON: &str = include_str!("../../config/chains.json");

pub fn get_supported_networks() -> Vec<SupportedNetwork> {
    let networks: Vec<SupportedNetwork> = serde_json::from_str(CHAINS_JSON).unwrap();
    return networks;
}
