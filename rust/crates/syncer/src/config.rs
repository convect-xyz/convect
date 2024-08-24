use std::env;

pub struct Config {
    pub function_id: String,
    pub chain_id: u64,
    pub start_block: u64,
    pub end_block: u64,
    pub tx_queue_url: String,
    pub deployment_id: String,
}

pub fn load_config_from_env() -> Config {
    return Config {
        function_id: env::var("FUNCTION_ID").expect("Function ID not set"),
        chain_id: env::var("CHAIN_ID")
            .expect("Chain ID not set")
            .parse()
            .expect("Chain ID not a u64"),
        start_block: env::var("START_BLOCK")
            .expect("START_BLOCK is not present")
            .parse()
            .expect("START_BLOCK is not a u64"),
        end_block: env::var("END_BLOCK")
            .expect("END_BLOCK is not present")
            .parse()
            .expect("END_BLOCK is not a u64"),
        tx_queue_url: env::var("TRANSACTION_QUEUE_URL")
            .expect("TRANSACTION_QUEUE_URL is not present"),
        deployment_id: env::var("DEPLOYMENT_ID").expect("DEPLOYMENT_ID is not present"),
    };
}
