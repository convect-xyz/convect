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
    pub chains: Vec<ChainConfig>,
}

impl Config {
    pub fn new() -> Self {
        Self {
            function_id: env::var("FUNCTION_ID").expect("FUNCTION_ID not set"),
            manifest_bucket: env::var("MANIFEST_BUCKET").expect("MANIFEST_BUCKET not set"),
            manifest_prefix: env::var("MANIFEST_PREFIX").expect("MANIFEST_PREFIX not set"),
            syncer_task_definition_arn: env::var("SYNCER_TASK_DEFINITION_ARN")
                .expect("SYNCER_TASK_DEFINITION_ARN not set"),
            syncer_cluster: env::var("SYNCER_CLUSTER").expect("SYNCER_CLUSTER not set"),
            syncer_subnets: env::var("SYNCER_SUBNETS")
                .expect("SYNCER_SUBNETS not set")
                .split(",")
                .map(|s| s.to_string())
                .collect(),
            version: env::var("VERSION").expect("VERSION not set"),
            github_sha: env::var("GITHUB_SHA").expect("GITHUB_SHA not set"),
            syncer_container_name: env::var("SYNCER_CONTAINER_NAME")
                .expect("SYNCER_CONTAINER_NAME not set"),
            deployment_id: env::var("DEPLOYMENT_ID").expect("DEPLOYMENT_ID not set"),
            project_id: env::var("PROJECT_ID").expect("PROJECT_ID not set"),
            chains: serde_json::from_str(&env::var("CHAINS").expect("CHAINS not set"))
                .expect("CHAINS not set"),
        }
    }

    pub fn release_name(&self) -> String {
        let github_sha = self.github_sha.clone();
        let version = self.version.clone();
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
