#[derive(Clone)]
pub struct HandlerServerConfig {
    pub deployment_id: String,
    pub function_id: String,
    pub chain_id: u64,
    pub project_id: i32,
    pub transaction_queue_url: String,
}

impl HandlerServerConfig {
    pub fn new() -> Self {
        Self {
            deployment_id: std::env::var("DEPLOYMENT_ID").expect("DEPLOYMENT_ID is not defined"),
            function_id: std::env::var("FUNCTION_ID").expect("FUNCTION_ID is not defined"),
            chain_id: std::env::var("CHAIN_ID")
                .expect("CHAIN_ID is not defined")
                .parse()
                .expect("CHAIN_ID is not a u64"),
            project_id: std::env::var("PROJECT_ID")
                .expect("PROJECT_ID is not defined")
                .parse()
                .expect("PROJECT_ID is not a i32"),
            transaction_queue_url: std::env::var("TRANSACTION_QUEUE_URL")
                .expect("TRANSACTION_QUEUE_URL is not defined"),
        }
    }
}
