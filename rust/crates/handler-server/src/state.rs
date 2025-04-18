use crate::config::HandlerServerConfig;
use aws_config::BehaviorVersion;
use shared::configuration::EnvironmentConfig;
use shared::processing;
use shared::{
    redis_client::RedisClientImpl,
    reporting_sdk::{ReportingSdk, SQSReportingSdk},
};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct AppState {
    pub handler_server_config: HandlerServerConfig,
    pub shared_config: EnvironmentConfig,
    pub pipeline: Arc<Mutex<processing::State>>,
    pub reporting: Arc<dyn ReportingSdk + Send + Sync>,
    pub sqs_client: aws_sdk_sqs::Client,
}

impl AppState {
    pub async fn new() -> Self {
        let handler_server_config = HandlerServerConfig::new();
        let function_id = handler_server_config.function_id.clone();
        let chain_id = handler_server_config.chain_id.clone();
        let deployment_id = handler_server_config.deployment_id.clone();
        let shared_config = EnvironmentConfig::new().await.unwrap();
        let pipeline = Arc::new(Mutex::new(
            processing::State::load(
                function_id,
                chain_id,
                deployment_id,
                Arc::new(
                    RedisClientImpl::new(&shared_config.redis.url)
                        .await
                        .unwrap(),
                ),
            )
            .await,
        ));
        let reporting_sdk = Arc::new(SQSReportingSdk::new_with_defaults().await);
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let sqs_client = aws_sdk_sqs::Client::new(&config);

        Self {
            pipeline,
            reporting: reporting_sdk,
            sqs_client,
            handler_server_config,
            shared_config,
        }
    }
}
