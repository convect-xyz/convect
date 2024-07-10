use std::error::{self};
use std::fmt;

use aws_config::BehaviorVersion;
use aws_sdk_sns::error::SdkError;
use aws_sdk_sns::operation::publish::PublishError;
use ethers::prelude::*;
use ethers::providers::{Middleware, Provider, Ws};
use futures::future::join_all;
use shared::networks::{get_supported_networks, SupportedNetwork};
use tokio_retry::strategy::{jitter, ExponentialBackoff};
use tokio_retry::Retry;

#[tokio::main]
async fn main() {
    let supported_networks = get_supported_networks();
    let mut handlers = Vec::new();

    for network in supported_networks.into_iter() {
        let handle = tokio::spawn(async move {
            let retry_strategy = ExponentialBackoff::from_millis(10).map(jitter).take(3);
            let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
            let client = aws_sdk_sns::Client::new(&config);

            let func = || async {
                run(&network, &client)
                    .await
                    .inspect_err(|e| println!("{:?}", e))?;

                Ok::<(), ProducerError>(())
            };

            match Retry::spawn(retry_strategy, func).await {
                Ok(_) => println!("Done (this should never happen)"),
                Err(e) => println!("Error occurred after multiple retries: {:?}", e),
            }
        });

        handlers.push(handle);
    }

    join_all(handlers).await;
}

async fn run(network: &SupportedNetwork, sns: &aws_sdk_sns::Client) -> Result<(), ProducerError> {
    println!("Connecting to {p}", p = network.name);

    let provider = Provider::<Ws>::connect(network.ws_url.clone())
        .await
        .inspect_err(|e| println!("{:?}", e))?;
    println!("Connected to {p}", p = network.name);

    let mut stream = provider.subscribe_blocks().await?;
    while let Some(block) = stream.next().await {
        let block_number = block.number;
        if block_number.is_none() {
            return Err(ProducerError::PendingBlock);
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
    PendingBlock,
    EmptyBlock,
    ProviderError(ProviderError),
    PublishError(SdkError<PublishError, aws_smithy_runtime_api::http::Response>),
}

impl error::Error for ProducerError {}

impl fmt::Display for ProducerError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ProducerError::PendingBlock => write!(f, "Block is pending"),
            ProducerError::EmptyBlock => write!(f, "Block is empty"),
            ProducerError::ProviderError(v) => write!(f, "Subscription error {:?}", v),
            ProducerError::PublishError(v) => write!(f, "Publishing error {:?}", v),
        }
    }
}

impl From<ProviderError> for ProducerError {
    fn from(err: ProviderError) -> ProducerError {
        ProducerError::ProviderError(err)
    }
}

impl From<SdkError<PublishError, aws_smithy_runtime_api::http::Response>> for ProducerError {
    fn from(err: SdkError<PublishError, aws_smithy_runtime_api::http::Response>) -> ProducerError {
        ProducerError::PublishError(err)
    }
}
