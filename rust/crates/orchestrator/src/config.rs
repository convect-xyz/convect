use serde::Deserialize;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub function_id: String,
    pub manifest_bucket: String,
    pub manifest_prefix: String,
    pub syncer_task_definition_arn: String,
    pub syncer_cluster: String,
    pub syncer_subnets: Vec<String>,
    pub version: String,
    pub syncer_container_name: String,
    pub deployment_id: String,
    pub project_id: String,
    pub github_sha: String,
    pub stripe_customer_id: String,
    pub chains: Vec<ChainConfig>,
}

impl Config {
    pub fn new() -> Result<Self, errors::ConfigError> {
        Ok(Self {
            function_id: env::var("FUNCTION_ID")?,
            manifest_bucket: env::var("MANIFEST_BUCKET")?,
            manifest_prefix: env::var("MANIFEST_PREFIX")?,
            syncer_task_definition_arn: env::var("SYNCER_TASK_DEFINITION_ARN")?,
            syncer_cluster: env::var("SYNCER_CLUSTER")?,
            syncer_subnets: env::var("SYNCER_SUBNETS")?
                .split(",")
                .map(|s| s.to_string())
                .collect(),
            version: env::var("VERSION")?,
            github_sha: env::var("GITHUB_SHA")?,
            syncer_container_name: env::var("SYNCER_CONTAINER_NAME")?,
            deployment_id: env::var("DEPLOYMENT_ID")?,
            project_id: env::var("PROJECT_ID")?,
            stripe_customer_id: env::var("STRIPE_CUSTOMER_ID")?,
            chains: serde_json::from_str(&env::var("CHAINS")?).expect("CHAINS not set"),
        })
    }

    pub fn release_name(&self) -> String {
        let github_sha = &self.github_sha;
        let version = &self.version;
        format!("orchestrator::{github_sha}::{version}")
    }
}

#[derive(Debug, Deserialize, Clone)]
pub struct ChainConfig {
    #[serde(rename = "chainId")]
    pub chain_id: u64,
    #[serde(rename = "txQueueUrl")]
    pub tx_queue_url: String,
}

pub mod errors {
    use std::env::VarError;

    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum ConfigError {
        #[error("Env var error: {0}")]
        MissingEnvVar(VarError),
    }
}
