use aws_config::BehaviorVersion;
use ethers::prelude::*;
use ethers::providers::{Middleware, Provider, Ws};
use futures::future::join_all;
use ingest::producer::{get_supported_networks, SupportedNetwork};

#[tokio::main]
async fn main() {
    let mut handles = Vec::new();
    for network in get_supported_networks().into_iter() {
        handles.push(run(network));
    }

    join_all(handles).await;
}

async fn run(network: SupportedNetwork) {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let client = aws_sdk_sns::Client::new(&config);

    let provider = Provider::<Ws>::connect(network.ws_url.clone())
        .await
        .expect(format!("Failed on {:?}", network.network).as_str());

    println!("Provider about to stream on {:?}", network.network);

    let mut stream = provider.subscribe_blocks().await.unwrap();

    while let Some(block) = stream.next().await {
        publish_block(&client, &network, block.number.unwrap().as_u64()).await;
    }

    return;
}

async fn publish_block(
    client: &aws_sdk_sns::Client,
    network: &SupportedNetwork,
    current_block: u64,
) {
    match client
        .publish()
        .topic_arn(network.sns_topic.clone())
        .message(current_block.to_string())
        .send()
        .await
    {
        Ok(_) => {
            println!("Uploaded to {:?}", network.network)
        }
        Err(e) => panic!("Error on {:?}: {:?}", network.network, e),
    }
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
