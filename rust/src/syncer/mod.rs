use std::env;

pub struct Config {
    pub start_block: u64,
    pub end_block: u64,
    pub function_name: String,
    pub tx_queue_url: String,
}

pub fn load_config_from_env() -> Config {
    return Config {
        start_block: env::var("START_BLOCK")
            .expect("START_BLOCK is not present")
            .parse()
            .expect("START_BLOCK is not a u64"),
        end_block: env::var("END_BLOCK")
            .expect("END_BLOCK is not present")
            .parse()
            .expect("END_BLOCK is not a u64"),
        function_name: env::var("LOG_FETCHER_LAMBDA_ARN")
            .expect("LOG_FETCHER_LAMBDA_ARN is not present"),
        tx_queue_url: env::var("TRANSACTION_QUEUE_URL")
            .expect("TRANSACTION_QUEUE_URL is not present"),
    };
}
