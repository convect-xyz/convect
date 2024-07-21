use std::error::{self};
use std::{fmt, thread};

use alloy::providers::{Provider, ProviderBuilder, WsConnect};
use alloy::transports::{RpcError, TransportError, TransportErrorKind};
use aws_config::BehaviorVersion;
use aws_sdk_sns::error::SdkError;
use aws_sdk_sns::operation::publish::PublishError;
use futures::StreamExt;
use shared::networks::{get_supported_networks, SupportedNetwork};
use tokio_retry::strategy::jitter;
use tokio_retry::Retry;

#[tokio::main(flavor = "multi_thread", worker_threads = 10)]
async fn main() {
    let supported_networks = get_supported_networks();
    let mut handlers = Vec::new();

    tracing_subscriber::fmt()
        .with_thread_names(true)
        .with_thread_ids(true)
        .init();

    for network in supported_networks.into_iter() {
        let handle = tokio::spawn(async move {
            let retry_strategy = tokio_retry::strategy::FixedInterval::from_millis(2000)
                .map(jitter)
                .take(usize::MAX);
            let func = || async {
                let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
                let client = aws_sdk_sns::Client::new(&config);
                let network_clone = network.clone();

                run(&network_clone, &client)
                    .await
                    .inspect_err(|e| println!("Producer Error {:?}", e))?;

                Err::<(), ProducerError>(ProducerError::EmptyBlock)
            };

            match Retry::spawn(retry_strategy, func).await {
                Ok(_) => println!("Retry succeeded"),
                Err(e) => println!("Retry failed: {:?}", e),
            }
        });
        handlers.push(handle);
    }

    for handle in handlers {
        match handle.await {
            Ok(_) => println!("Handler finished"),
            Err(e) => println!("Handler failed: {:?}", e),
        }
    }
}

async fn run(network: &SupportedNetwork, sns: &aws_sdk_sns::Client) -> Result<(), ProducerError> {
    println!("Running {:?} on {:?}", network.name, thread::current().id());

    println!("Connecting to {p}", p = network.name);

    println!("Network {:?}", network);

    let ws = WsConnect::new(network.ws_url.clone());
    let provider = ProviderBuilder::new().on_ws(ws).await?;
    println!("Connected to {p}", p = network.name);

    let subscription = provider.subscribe_blocks().await?;
    let mut stream = subscription.into_result_stream().take(usize::MAX);

    println!("Subscribed to {p}", p = network.name);
    while let Some(maybe_block) = stream.next().await {
        let block = maybe_block.unwrap();
        println!(
            "Received block {number} on {network}.",
            number = block.header.number.unwrap_or_default(),
            network = network.name
        );

        let block_number = block.header.number;
        if block_number.is_none() {
            continue;
        }

        println!("Publishing to {p}", p = network.name);
        sns.publish()
            .topic_arn(network.sns_topic.clone())
            .message(block_number.unwrap().to_string())
            .send()
            .await?;
        println!("Published to {p}", p = network.name);
    }

    Err(ProducerError::EmptyBlock)
}

#[derive(Debug)]
enum ProducerError {
    EmptyBlock,
    TransportError(TransportError),
    PublishError(SdkError<PublishError, aws_smithy_runtime_api::http::Response>),
}

impl error::Error for ProducerError {}

impl fmt::Display for ProducerError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ProducerError::EmptyBlock => write!(f, "Block is empty"),
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
