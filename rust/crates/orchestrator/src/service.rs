use lambda_runtime::tracing;
use shared::{
    enqueuer::{SQSTransactionEnqueuer, TransactionEnqueuer},
    fetcher::{
        graphql::{GethGraphqlClient, GethGraphqlClientImpl},
        TransactionFetcher, TransactionFetcherImpl,
    },
    manifest::{
        providers::{InitBlockProvider, InitBlockProviderImpl},
        Manifest,
    },
    networks::get_supported_network,
    redis_client::{RedisClient, RedisClientImpl},
    s3::S3,
    web3_client::{Web3Client, Web3ClientImpl},
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::OnceCell;

use crate::config::{ChainConfig, Config};

static WEB3_CLIENTS: OnceCell<HashMap<u64, Web3ClientImpl>> = OnceCell::const_new();

#[tracing::instrument(skip_all)]
async fn get_web3_client(chain_id: &u64, config: &Config) -> &'static Web3ClientImpl {
    WEB3_CLIENTS
        .get_or_init(|| async {
            HashMap::from_iter(config.chains.iter().map(|c| {
                let supported_network = get_supported_network(c.chain_id).unwrap();

                (
                    c.chain_id,
                    Web3ClientImpl::new(c.chain_id, supported_network.polling_urls.clone()),
                )
            }))
        })
        .await
        .get(&chain_id)
        .unwrap()
}

static MANIFEST: OnceCell<Manifest> = OnceCell::const_new();
#[tracing::instrument(skip_all)]
async fn get_manifest() -> &'static Manifest {
    MANIFEST
        .get_or_init(|| async { Manifest::from_env().await.unwrap() })
        .await
}

pub struct AppService {
    pub config: Config,
    pub ecs_client: aws_sdk_ecs::Client,
    pub s3_client: aws_sdk_s3::Client,
    pub sqs_client: aws_sdk_sqs::Client,
    pub manifest: Manifest,
}

impl AppService {
    pub async fn with_defaults() -> Self {
        let sdk_config = aws_config::load_from_env().await;
        let ecs_client = aws_sdk_ecs::Client::new(&sdk_config);
        let s3_client = aws_sdk_s3::Client::new(&sdk_config);
        let sqs_client = aws_sdk_sqs::Client::new(&sdk_config);

        Self {
            config: Config::new(),
            manifest: get_manifest().await.clone(),
            ecs_client,
            s3_client,
            sqs_client,
        }
    }
}

pub struct ChainService {
    pub config: ChainConfig,
    pub web3_client: Box<dyn Web3Client>,
    pub transaction_fetcher: Box<dyn TransactionFetcher>,
    pub transaction_enqueuer: Box<dyn TransactionEnqueuer>,
    pub init_block_provider: Box<dyn InitBlockProvider>,
    pub redis_client: Arc<dyn RedisClient>,
}

impl ChainService {
    pub async fn with_defaults(app_service: &AppService, config: ChainConfig) -> Self {
        let web3_client = get_web3_client(&config.chain_id, &app_service.config).await;
        let fetcher = TransactionFetcherImpl::new(
            GethGraphqlClientImpl::new(
                get_supported_network(config.chain_id)
                    .unwrap()
                    .polling_urls
                    .first()
                    .unwrap()
                    .to_string(),
            ),
            config.chain_id,
        );
        let enqueuer = SQSTransactionEnqueuer::new(
            app_service.s3_client.clone(),
            config.tx_queue_url.clone(),
            app_service.sqs_client.clone(),
        );
        let redis_client = RedisClientImpl::new().await;
        let init_block_provider = InitBlockProviderImpl::new(Box::new(web3_client.clone()));

        Self {
            config,
            web3_client: Box::new(web3_client.clone()),
            transaction_fetcher: Box::new(fetcher),
            transaction_enqueuer: Box::new(enqueuer),
            init_block_provider: Box::new(init_block_provider),
            redis_client: Arc::new(redis_client),
        }
    }
}
