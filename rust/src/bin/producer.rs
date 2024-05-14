use aws_config::BehaviorVersion;
use ethers::prelude::*;
use ethers::providers::{Middleware, Provider, Ws};
use futures::future::join_all;
use ingest::producer::{get_supported_networks, SupportedNetwork};

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
            Ok(p) => handlers.push(run(network, p, &client)),
            Err(e) => panic!("Failed to connect to handler: {:?}", e),
        }
    }

    join_all(handlers).await;
}

async fn run(network: &SupportedNetwork, provider: &Provider<Ws>, sns: &aws_sdk_sns::Client) {
    let mut stream = provider.subscribe_blocks().await.unwrap();

    while let Some(block) = stream.next().await {
        if let Some(number) = block.number {
            match sns
                .publish()
                .topic_arn(network.sns_topic.clone())
                .message(number.to_string())
                .send()
                .await
            {
                Ok(_) => {
                    println!("Uploaded to {:?}", network.name)
                }
                Err(e) => panic!("Error on {:?}: {:?}", network.name, e),
            }
        }
    }

    return;
}

#[cfg(test)]
mod tests {
    // use super::*;

    #[test]
    fn test_publish_block() {}
}
// async fn run(network: &SupportedNetwork) {
//     let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
//     let client = aws_sdk_sns::Client::new(&config);

//     if mode.eq("WS") {
//         let provider = Provider::<Ws>::connect(ws_url).await.unwrap();

//         let mut stream = provider.subscribe_blocks().await.unwrap();
//         while let Some(block) = stream.next().await {
//             publish_block(&client, block.number.unwrap().as_u64()).await;
//         }

//         return;
//     }

//     let provider = Provider::<Http>::try_from(polling_url.as_str()).unwrap();
//     let mut last_block: Option<u64> = None;

//     loop {
//         let current_block = provider.get_block_number().await.unwrap().as_u64();
//         println!("{current_block}");

//         if last_block.is_none() || current_block > last_block.unwrap() {
//             publish_block(&client, current_block).await;
//             last_block = Some(current_block);
//         }

//         tokio::time::sleep(time::Duration::from_secs(10)).await;
//     }
// }
