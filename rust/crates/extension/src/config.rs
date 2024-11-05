use lazy_static::lazy_static;
use std::env;

lazy_static! {
    pub static ref config: Config = load_config_from_env();
}

pub struct Config {
    pub function_id: String,
    pub chain_id: u64,
    pub deployment_id: String,
    pub project_id: i32,
}

pub fn load_config_from_env() -> Config {
    return Config {
        function_id: env::var("FUNCTION_ID").expect("Function ID is undefined"),
        chain_id: env::var("CHAIN_ID")
            .expect("Chain ID is undefined")
            .parse()
            .unwrap(),
        deployment_id: env::var("DEPLOYMENT_ID").expect("Deployment ID is undefined"),
        project_id: env::var("PROJECT_ID")
            .expect("PROJECT_ID is not defined")
            .parse()
            .unwrap(),
    };
}
