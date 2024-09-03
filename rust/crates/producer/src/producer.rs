use std::future::Future;
use std::sync::Arc;

use alloy::providers::{Provider, ProviderBuilder, WsConnect};
use alloy::pubsub::{ConnectionHandle, PubSubConnect, SubscriptionItem};
use alloy::rpc::client::ClientBuilder;
use alloy::transports::TransportResult;
use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use shared::networks::SupportedNetwork;
use tokio::sync::Mutex;
use tokio::time;
use tokio_retry::strategy::jitter;
use tokio_retry::Retry;

#[async_trait]
pub trait ProducerModule: Send + Sync {
    async fn produce_async(&self) -> Result<(), errors::ProducerError>;
    async fn get_current(&self) -> (Option<u64>, Option<DateTime<Utc>>);
    fn network(&self) -> &SupportedNetwork;
}

#[derive(Clone)]
pub struct ProducerModuleImpl {
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
            tracing::info!("[{:?}] Producing", network.name);
            let ws = RetryWsConnect(WsConnect::new(network.ws_url.clone()), network.clone());
            let client = ClientBuilder::default().pubsub(ws).await?;

            let provider = ProviderBuilder::new()
                .with_recommended_fillers()
                .on_client(client);
            let mut subscription = provider.subscribe_blocks().await?;

            while let Ok(SubscriptionItem::Item(block)) = subscription.recv_any().await {
                let block_number = block.header.number;
                if block_number.is_none() {
                    tracing::error!("[{:?}] Block number is none", network.name);
                    return Err::<(), errors::ProducerError>(errors::ProducerError::EmptyBlock);
                }

                time::interval(time::Duration::from_secs(2)).tick().await;

                *current.lock().await = block_number;
                *last_updated_at.lock().await = Some(Utc::now());
            }

            tracing::info!("[{:?}] Exited while loop, returning", network.name);
            Err::<(), errors::ProducerError>(errors::ProducerError::EmptyBlock)
        };

        let retry_strategy = tokio_retry::strategy::FixedInterval::from_millis(200)
            .map(jitter)
            .take(usize::MAX);

        match Retry::spawn(retry_strategy, func).await {
            Ok(_) => tracing::info!("[{:?}] Retry succeeded", network.name),
            Err(e) => tracing::error!("[{:?}] Retry failed: {:?}", network.name, e),
        };

        Ok(())
    }

    async fn get_current(&self) -> (Option<u64>, Option<DateTime<Utc>>) {
        (
            self.current.lock().await.clone(),
            self.last_updated_at.lock().await.clone(),
        )
    }

    fn network(&self) -> &SupportedNetwork {
        &self.network
    }
}

#[derive(Clone, Debug)]
pub struct RetryWsConnect(WsConnect, SupportedNetwork);

impl PubSubConnect for RetryWsConnect {
    fn is_local(&self) -> bool {
        self.0.is_local()
    }

    #[tracing::instrument(skip_all)]
    fn connect(&self) -> impl Future<Output = TransportResult<ConnectionHandle>> {
        tracing::info!("Connecting to {:?}", self.1.name);
        self.0.connect()
    }

    #[tracing::instrument(skip_all)]
    async fn try_reconnect(&self) -> TransportResult<ConnectionHandle> {
        panic!("Forced to reconnect to {:?}, so exiting.", self.1.name);
    }
}

pub mod errors {
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
