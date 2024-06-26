use std::error::{self};
use std::fmt;

use aws_config::BehaviorVersion;
use aws_sdk_sns::error::BoxError;
use backoff::exponential::ExponentialBackoff;
use backoff::SystemClock;
use ethers::prelude::*;
use ethers::providers::{Middleware, Provider, Ws};
use futures::future::join_all;
use shared::networks::{get_supported_networks, SupportedNetwork};

#[tokio::main]
async fn main() {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let client = aws_sdk_sns::Client::new(&config);

    let supported_networks = get_supported_networks();
    let providers = join_all(
        supported_networks
            .iter()
            .map(|n| Provider::<Ws>::connect(n.ws_url.clone())),
    )
    .await;

    let mut handlers = Vec::new();

    for (i, network) in supported_networks.iter().enumerate() {
        let provider_result = providers.get(i).expect("Provider not present");

        match provider_result {
            Ok(p) => handlers.push(backoff::future::retry::<
                (),
                backoff::Error<BoxError>,
                _,
                _,
                ExponentialBackoff<SystemClock>,
            >(ExponentialBackoff::default(), || async {
                run(network, p, &client)
                    .await
                    .inspect_err(|e| println!("{:?}", e))
                    .map_err(backoff::Error::transient)?;

                Ok(())
            })),
            Err(e) => panic!("Failed to connect to handler: {:?}", e),
        }
    }

    join_all(handlers).await;
}

#[derive(Debug, Clone)]
struct EmptyBlockNumber;
impl fmt::Display for EmptyBlockNumber {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "empty block number")
    }
}
impl error::Error for EmptyBlockNumber {}

async fn run(
    network: &SupportedNetwork,
    provider: &Provider<Ws>,
    sns: &aws_sdk_sns::Client,
) -> Result<(), BoxError> {
    let mut stream = provider.subscribe_blocks().await?;

    while let Some(block) = stream.next().await {
        let block_number = block.number;

        if block_number.is_none() {
            return Err(EmptyBlockNumber.into());
        }

        println!("Publishing to {p}", p = network.name);

        sns.publish()
            .topic_arn(network.sns_topic.clone())
            .message(block_number.unwrap().to_string())
            .send()
            .await?;

        println!("Published to {p}", p = network.name);
    }

    Err(EmptyBlockNumber.into())
}

#[cfg(test)]
mod tests {
    // use super::*;

    #[test]
    fn test_publish_block() {}
}
