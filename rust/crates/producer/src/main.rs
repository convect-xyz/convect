use std::collections::HashMap;
use std::panic;
use std::sync::Arc;

use alloy::providers::{Provider, ProviderBuilder, WsConnect};
use alloy::pubsub::SubscriptionItem;
use alloy::{
    pubsub::{ConnectionHandle, PubSubConnect},
    rpc::client::ClientBuilder,
    transports::{impl_future, TransportResult},
};
use anyhow::Result;
use async_trait::async_trait;
use aws_config::BehaviorVersion;
use chrono::prelude::*;
use chrono::{DateTime, Utc};
use futures::future::join_all;
use resend_rs::types::CreateEmailBaseOptions;
use shared::networks::{get_supported_networks, SupportedNetwork};
use shared::resend::errors::ResendError;
use shared::resend::{ResendClient, ResendClientImpl};
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
        .with_ansi(false)
        .init();

    let producer_modules: Vec<_> = get_supported_networks()
        .into_iter()
        .map(|network| Arc::new(ProducerModuleImpl::new(network)))
        .collect();
    let producer_task_handles: Vec<_> = producer_modules
        .iter()
        .map(|module| {
            let retry_strategy = tokio_retry::strategy::ExponentialBackoff::from_millis(15)
                .map(jitter)
                .take(usize::MAX);

            let func = move || async move {
                let module = module.clone();

                tokio::spawn(async move {
                    module.produce_async().await?;
                    Ok::<(), errors::ProducerError>(())
                })
                .await
                .inspect_err(|e| {
                    println!("Producer task failed: {:?}", e);
                })?
                .inspect_err(|e| {
                    println!("Producer task failed #2: {:?}", e);
                })?;

                Ok::<(), errors::ProducerError>(())
            };

            Retry::spawn(retry_strategy, func)
        })
        .collect();

    let listen_join_handle = listen(&producer_modules).await;

    let result = join_all(producer_task_handles).await;
    for handle in result.into_iter() {
        match handle {
            Ok(_) => println!("Handler finished"),
            Err(e) => println!("Handler failed: {:?}", e),
        }
    }

    listen_join_handle.await.unwrap();
}

async fn listen(producer_modules: &Vec<Arc<ProducerModuleImpl>>) -> JoinHandle<()> {
    let resend_client = ResendClientImpl::new("re_iyb1AW3g_9N617G19Aj5wsXj5ydsBqFNp");
    let sns_client =
        aws_sdk_sns::Client::new(&aws_config::load_defaults(BehaviorVersion::latest()).await);

    let producer_modules = producer_modules.clone();
    tokio::spawn(async move {
        let mut last_sent_at: Option<DateTime<Utc>> = None;
        let mut interval: time::Interval = time::interval(time::Duration::from_secs(3));
        println!("Starting listen");

        let mut did_print = false;
        loop {
            interval.tick().await;

            let mut current_blocks = HashMap::new();
            for module in producer_modules.iter() {
                let network = &module.network;
                let (current_block, last_updated_at) = module.get_current().await;
                if let Some(current_block) = current_block {
                    current_blocks.insert(network.id, current_block);
                }

                let now = Utc::now();
                if let Some(last_sent_at) = last_sent_at {
                    // If last sent at is less than 10 minutes ago, don't send again
                    if now.timestamp() - last_sent_at.timestamp() < 600 {
                        continue;
                    }
                }

                match last_updated_at {
                    Some(last_updated_at) => {
                        // If last updated at is more than 60 seconds ago, send an email
                        if now.timestamp() - last_updated_at.timestamp() > 60 {
                            let _ = notify_block_issue(
                                ProducerModuleIssue::BlockNotChanged(
                                    network,
                                    current_block,
                                    last_updated_at,
                                ),
                                &resend_client,
                            )
                            .await;
                            last_sent_at = Some(now);
                        }
                    }
                    None => {
                        let _ =
                            notify_block_issue(ProducerModuleIssue::NoCurrentBlock, &resend_client)
                                .await;
                        last_sent_at = Some(now);
                    }
                }
            }

            if !did_print && current_blocks.len() == producer_modules.len() {
                did_print = true;
                println!("Current Blocks: {:?}", current_blocks);
            }

            sns_client
                .publish()
                .topic_arn(PRODUCER_SNS_TOPIC)
                .message(serde_json::to_string(&current_blocks).unwrap())
                .send()
                .await
                .unwrap();
        }
    })
}
enum ProducerModuleIssue<'a> {
    BlockNotChanged(&'a SupportedNetwork, Option<u64>, DateTime<Utc>),
    NoCurrentBlock,
}

async fn notify_block_issue(
    issue: ProducerModuleIssue<'_>,
    resend_client: &ResendClientImpl,
) -> Result<(), ResendError> {
    let message = match issue {
        ProducerModuleIssue::BlockNotChanged(network, last_block, last_changed_at) => {
            format!(
                "Block for {:?} not changed since {:?}. Last block: {:?}",
                network.name, last_changed_at, last_block
            )
        }
        ProducerModuleIssue::NoCurrentBlock => "No current block for".to_string(),
    };

    resend_client
        .send_email(
            CreateEmailBaseOptions::new(
                "notification@convect.xyz",
                vec!["kayakthedev@gmail.com".to_string()],
                "Producer Error",
            )
            .with_text(message.as_str()),
        )
        .await?;

    Ok(())
}

#[async_trait]
trait ProducerModule {
    async fn produce_async(&self) -> Result<(), errors::ProducerError>;
    async fn get_current(&self) -> (Option<u64>, Option<DateTime<Utc>>);
}

#[derive(Clone)]
struct ProducerModuleImpl {
    network: SupportedNetwork,
    current: Arc<Mutex<Option<u64>>>,
    last_updated_at: Arc<Mutex<Option<DateTime<Utc>>>>,
}

impl ProducerModuleImpl {
    pub fn new(network: SupportedNetwork) -> ProducerModuleImpl {
        ProducerModuleImpl {
            network,
            current: Arc::new(Mutex::new(None)),
            last_updated_at: Arc::new(Mutex::new(None)),
        }
    }
}

#[async_trait]
impl ProducerModule for ProducerModuleImpl {
    async fn produce_async(&self) -> Result<(), errors::ProducerError> {
        let network = self.network.clone();
        let current = self.current.clone();
        let last_updated_at = self.last_updated_at.clone();

        let func = || async {
            println!("Producing");
            let ws = WsConnect::new(network.ws_url.clone());
            let ws = RetryWsConnect(ws);
            let client = ClientBuilder::default().pubsub(ws).await?;

            let provider = ProviderBuilder::new()
                .with_recommended_fillers()
                .on_client(client);
            let mut subscription = provider.subscribe_blocks().await?;

            while let Ok(SubscriptionItem::Item(block)) = subscription.recv_any().await {
                let block_number = block.header.number;
                if block_number.is_none() {
                    println!("Block number is none");
                    return Err::<(), errors::ProducerError>(errors::ProducerError::EmptyBlock);
                }

                *current.lock().await = block_number;
                *last_updated_at.lock().await = Some(Utc::now());
            }

            println!("Exited while loop, returning");
            Err::<(), errors::ProducerError>(errors::ProducerError::EmptyBlock)
        };

        let retry_strategy = tokio_retry::strategy::FixedInterval::from_millis(2000)
            .map(jitter)
            .take(usize::MAX);

        match Retry::spawn(retry_strategy, func).await {
            Ok(_) => println!("Retry succeeded"),
            Err(e) => println!("Retry failed: {:?}", e),
        };

        Ok(())
    }

    async fn get_current(&self) -> (Option<u64>, Option<DateTime<Utc>>) {
        (
            self.current.lock().await.clone(),
            self.last_updated_at.lock().await.clone(),
        )
    }
}

mod errors {
    use alloy::transports::{RpcError, TransportErrorKind};
    use aws_sdk_sns::{error::SdkError, operation::publish::PublishError};
    use thiserror::Error;
    use tokio::task::JoinError;

    #[derive(Error, Debug)]
    pub enum ProducerError {
        #[error("Block is empty")]
        EmptyBlock,
        #[error("Transport error {0}")]
        TransportError(#[from] RpcError<TransportErrorKind>),
        #[error("Publishing error {0}")]
        PublishError(#[from] SdkError<PublishError, aws_smithy_runtime_api::http::Response>),
        #[error("Join error {0}")]
        JoinError(#[from] JoinError),
    }
}

#[derive(Clone, Debug)]
pub struct RetryWsConnect(WsConnect);

impl PubSubConnect for RetryWsConnect {
    fn is_local(&self) -> bool {
        self.0.is_local()
    }

    fn connect(&self) -> impl_future!(<Output = TransportResult<ConnectionHandle>>) {
        println!("Connecting");
        self.0.connect()
    }

    async fn try_reconnect(&self) -> TransportResult<ConnectionHandle> {
        panic!("Forced to reconnect, so exiting.");
    }
}
