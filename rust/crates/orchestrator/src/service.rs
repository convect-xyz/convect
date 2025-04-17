use lambda_runtime::tracing;
use shared::{
    configuration::{EnvironmentConfig, RefreshingEnvironmentConfig},
    connection::establish_connection_pool,
    enqueuer::{SQSTransactionEnqueuer, TransactionEnqueuer},
    fetcher::{web3::client::Web3ClientImpl, TransactionFetcher, TransactionFetcherImpl},
    manifest::Manifest,
    networks::get_supported_network,
    redis_client::{RedisClient, RedisClientImpl},
    telemetry::StripeProcessedTransactionTelemetry,
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::OnceCell;

use crate::config::{ChainConfig, Config};

static MANIFEST: OnceCell<Manifest> = OnceCell::const_new();
#[tracing::instrument(skip_all)]
async fn get_manifest() -> &'static Manifest {
    MANIFEST
        .get_or_init(|| async { Manifest::from_env().await.unwrap() })
        .await
}

pub struct AppService {
    pub refreshing_env: RefreshingEnvironmentConfig,
    pub config: Config,
    pub ecs_client: aws_sdk_ecs::Client,
    pub s3_client: aws_sdk_s3::Client,
    pub sqs_client: aws_sdk_sqs::Client,
    pub redis_client: Arc<dyn RedisClient>,
    pub manifest: Manifest,
}

impl AppService {
    pub async fn with_defaults() -> Self {
        let sdk_config = aws_config::load_from_env().await;
        let ecs_client = aws_sdk_ecs::Client::new(&sdk_config);
        let s3_client = aws_sdk_s3::Client::new(&sdk_config);
        let sqs_client = aws_sdk_sqs::Client::new(&sdk_config);
        let refreshing_env = RefreshingEnvironmentConfig::new().await;
        let redis_client = RedisClientImpl::new(&refreshing_env.get_config().await.redis.url).await;

        Self {
            config: Config::new(),
            manifest: get_manifest().await.clone(),
            ecs_client,
            s3_client,
            sqs_client,
            redis_client: Arc::new(redis_client),
            refreshing_env,
        }
    }
}

pub struct ChainService {
    pub config: ChainConfig,
    pub transaction_fetcher: Box<dyn TransactionFetcher>,
    pub transaction_enqueuer: Box<dyn TransactionEnqueuer>,
}

impl ChainService {
    pub async fn with_defaults(app_service: &AppService, config: ChainConfig) -> Self {
        let fetcher = TransactionFetcherImpl::with_defaults(config.chain_id).await;
        let pool = establish_connection_pool().await;
        let enqueuer = SQSTransactionEnqueuer::new(
            app_service.s3_client.clone(),
            config.tx_queue_url.clone(),
            app_service.sqs_client.clone(),
            pool,
            config.chain_id,
            app_service.manifest.clone(),
            StripeProcessedTransactionTelemetry::new(app_service.config.stripe_customer_id.clone()),
        );

        Self {
            config,
            transaction_fetcher: Box::new(fetcher),
            transaction_enqueuer: Box::new(enqueuer),
        }
    }
}
