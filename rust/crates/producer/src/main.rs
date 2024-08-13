use std::collections::HashMap;
use std::error::{self};
use std::fmt;
use std::sync::Arc;

use alloy::providers::{Provider, ProviderBuilder, WsConnect};
use alloy::transports::{RpcError, TransportError, TransportErrorKind};
use async_trait::async_trait;
use aws_config::BehaviorVersion;
use aws_sdk_sns::error::SdkError;
use aws_sdk_sns::operation::publish::PublishError;
use futures::future::join_all;
use futures::StreamExt;
use shared::networks::{get_supported_networks, SupportedNetwork};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio::time;
use tokio_retry::strategy::jitter;
use tokio_retry::Retry;

const PRODUCER_SNS_TOPIC: &str = "arn:aws:sns:eu-west-1:730335604495:all-chains";

#[tokio::main(flavor = "multi_thread", worker_threads = 10)]
async fn main() {
    tracing_subscriber::fmt()
        .with_thread_names(true)
        .with_thread_ids(true)
        .init();

    let sns_client =
        aws_sdk_sns::Client::new(&aws_config::load_defaults(BehaviorVersion::latest()).await);
    let producer_modules: Vec<_> = get_supported_networks()
        .into_iter()
        .map(|network| {
            Arc::new(Mutex::new(ProducerModuleImpl::new(
                network,
                sns_client.clone(),
            )))
        })
        .collect();

    let handlers: Vec<_> = join_all(producer_modules.iter().map(|module| {
        let module_mutex = module.clone();
        async move {
            let mut module = module_mutex.lock().await;
            module.init()
        }
    }))
    .await;

    println!("Producers: {:?}", producer_modules.len());

    tokio::spawn(async move {
        let mut interval: time::Interval = time::interval(time::Duration::from_secs(4));

        loop {
            interval.tick().await;
            let mut current_blocks = HashMap::new();
            for module in producer_modules.iter() {
                let module = module.lock().await;
                let network = &module.network;
                let current_block = module.get_current().await;
                if current_block.is_some() {
                    current_blocks.insert(network.id, current_block.unwrap());
                }
            }

            println!("Current Blocks: {:?}", current_blocks);

            sns_client
                .publish()
                .topic_arn(PRODUCER_SNS_TOPIC)
                .message(serde_json::to_string(&current_blocks).unwrap())
                .send()
                .await
                .unwrap();
        }
    });

    for handle in handlers.into_iter() {
        match handle.await {
            Ok(_) => println!("Handler finished"),
            Err(e) => println!("Handler failed: {:?}", e),
        }
    }
}

#[derive(Debug)]
enum ProducerError {
    EmptyBlock,
    UnexpectedError,
    TransportError(TransportError),
    PublishError(SdkError<PublishError, aws_smithy_runtime_api::http::Response>),
}

impl error::Error for ProducerError {}

impl fmt::Display for ProducerError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ProducerError::EmptyBlock => write!(f, "Block is empty"),
            ProducerError::UnexpectedError => write!(f, "Unexpected"),
            ProducerError::TransportError(v) => write!(f, "Transport error {:?}", v),
            ProducerError::PublishError(v) => write!(f, "Publishing error {:?}", v),
        }
    }
}

impl From<SdkError<PublishError, aws_smithy_runtime_api::http::Response>> for ProducerError {
    fn from(err: SdkError<PublishError, aws_smithy_runtime_api::http::Response>) -> ProducerError {
        ProducerError::PublishError(err.into())
    }
}

impl From<RpcError<TransportErrorKind>> for ProducerError {
    fn from(err: RpcError<TransportErrorKind>) -> ProducerError {
        ProducerError::TransportError(err.into())
    }
}

#[async_trait]
trait ProducerModule {
    fn init(&mut self) -> JoinHandle<()>;
    async fn get_current(&self) -> Option<u64>;
}

#[derive(Clone)]
struct ProducerModuleImpl {
    network: SupportedNetwork,
    sns: aws_sdk_sns::Client,
    current: Arc<Mutex<Option<u64>>>,
}

impl ProducerModuleImpl {
    pub fn new(network: SupportedNetwork, sns_client: aws_sdk_sns::Client) -> ProducerModuleImpl {
        ProducerModuleImpl {
            network,
            sns: sns_client,
            current: Arc::new(Mutex::new(None)),
        }
    }
}

#[async_trait]
impl ProducerModule for ProducerModuleImpl {
    fn init(&mut self) -> JoinHandle<()> {
        let network = self.network.clone();
        let sns = self.sns.clone();
        let current = self.current.clone();

        tokio::spawn(async move {
            let retry_strategy = tokio_retry::strategy::FixedInterval::from_millis(2000)
                .map(jitter)
                .take(usize::MAX);

            let func = || async {
                let ws = WsConnect::new(network.ws_url.clone());
                let provider = ProviderBuilder::new().on_ws(ws).await?;

                let subscription = provider.subscribe_blocks().await?;

                let mut stream = subscription.into_result_stream();
                while let Some(block) = stream.next().await {
                    let block = block.map_err(|_| ProducerError::UnexpectedError)?;
                    let block_number = block.header.number;
                    if block_number.is_none() {
                        continue;
                    }

                    println!(
                        "Publishing {b} to {p}",
                        b = block_number.unwrap(),
                        p = network.name
                    );
                    sns.publish()
                        .topic_arn(network.sns_topic.clone())
                        .message(block_number.unwrap().to_string())
                        .send()
                        .await?;

                    *current.lock().await = block_number;
                }

                Err::<(), ProducerError>(ProducerError::EmptyBlock)
            };

            match Retry::spawn(retry_strategy, func).await {
                Ok(_) => println!("Retry succeeded"),
                Err(e) => println!("Retry failed: {:?}", e),
            };
        })
    }

    async fn get_current(&self) -> Option<u64> {
        self.current.lock().await.clone()
    }
}
