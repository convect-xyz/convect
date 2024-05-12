#[derive(Debug)]
pub enum SupportedNetworkType {
    EthereumMainnet,
    PolygonMatic,
    PolygonAmoy,
    BlastMainnet,
    BlastSepolia,
}

pub struct SupportedNetwork {
    pub network: SupportedNetworkType,
    pub polling_url: String,
    pub ws_url: String,
    pub sns_topic: String,
}

pub fn get_supported_networks() -> Vec<SupportedNetwork> {
    return vec![
        SupportedNetwork {
            network: SupportedNetworkType::EthereumMainnet,
            polling_url: "".to_string(),
            ws_url: "wss://eth-mainnet.g.alchemy.com/v2/9XxfVSh91vo3fDuPN6zVouOwn82IPlpu"
                .to_string(),
            sns_topic: "arn:aws:sns:eu-west-1:730335604495:eth-mainnet".to_string(),
        },
        SupportedNetwork {
            network: SupportedNetworkType::PolygonMatic,
            polling_url: "".to_string(),
            ws_url: "wss://polygon-mainnet.g.alchemy.com/v2/RR6SauaFrOOffGTqGrmea2EzWQvIUCtK"
                .to_string(),
            sns_topic: "arn:aws:sns:eu-west-1:730335604495:polygon-matic".to_string(),
        },
        SupportedNetwork {
            network: SupportedNetworkType::PolygonAmoy,
            polling_url: "".to_string(),
            ws_url: "wss://polygon-amoy.g.alchemy.com/v2/WHbTD19RIAt8R1leUqIE1NaD9nDh_kn4"
                .to_string(),
            sns_topic: "arn:aws:sns:eu-west-1:730335604495:polygon-amoy".to_string(),
        },
        SupportedNetwork {
            network: SupportedNetworkType::BlastMainnet,
            polling_url: "".to_string(),
            ws_url: "wss://orbital-lively-shape.blast-mainnet.quiknode.pro/4438d7ee9173c04e77eb8f42d52f9fb2a9fb7a47/".to_string(),
            sns_topic: "arn:aws:sns:eu-west-1:730335604495:blast".to_string(),
        },
        // SupportedNetwork {
        //     network: SupportedNetworkType::BlastSepolia,
        //     polling_url: "".to_string(),
        //     ws_url: "".to_string(),
        //     sns_topic: "arn:aws:sns:eu-west-1:730335604495:blast-testnet".to_string(),
        // },
    ];
}
