use std::{collections::HashMap, env, time};

use aws_config::BehaviorVersion;
use reqwest::Error;
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
struct TaskWithTagsResponse {
    #[serde(rename(deserialize = "Cluster"))]
    cluster: String,
    #[serde(rename(deserialize = "TaskARN"))]
    task_arn: String,
    #[serde(rename(deserialize = "TaskTags"))]
    task_tags: HashMap<String, String>,
}

async fn get_task_with_tags() -> Result<TaskWithTagsResponse, Error> {
    reqwest::get(env::var("ECS_CONTAINER_METADATA_URI_V4").unwrap() + "/taskWithTags")
        .await?
        .json::<TaskWithTagsResponse>()
        .await
}

fn get_value(tags: &HashMap<String, String>, key: String) -> String {
    return tags.get(&key).unwrap().to_string();
}

async fn get_current_block(task_info: &TaskWithTagsResponse) -> Result<u64, Error> {
    let client = reqwest::Client::new();

    let data = json!({
      "id": 1,
      "jsonrpc": "2.0",
      "method": "eth_blockNumber"
    });

    let polling_url = get_value(&task_info.task_tags, "pollingUrl".to_string());

    let res = client
        .post(polling_url)
        .json(&data)
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    let hex = res
        .as_object()
        .unwrap()
        .get("result")
        .unwrap()
        .as_str()
        .unwrap()
        .trim_start_matches("0x");

    Ok(u64::from_str_radix(hex, 16).unwrap())
}

#[tokio::main]
async fn main() -> Result<(), aws_sdk_sns::Error> {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let client = aws_sdk_sns::Client::new(&config);

    let task_info = get_task_with_tags().await.unwrap();

    let mut last_block: Option<u64> = None;

    loop {
        let current_block = get_current_block(&task_info).await.unwrap();
        println!("{current_block}");

        if last_block.is_none() || current_block > last_block.unwrap() {
            let sns_topic = get_value(&task_info.task_tags, "snsTopicArn".to_string());

            let resp = client
                .publish()
                .topic_arn(sns_topic)
                .message(current_block.to_string())
                // .message_group_id("logs")
                .send()
                .await?;

            println!("{}", resp.message_id.unwrap());
            last_block = Some(current_block);
        }

        tokio::time::sleep(time::Duration::from_secs(10)).await;
    }
}
