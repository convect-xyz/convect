use aws_sdk_sqs::{
    error::SdkError,
    operation::{
        create_queue::{CreateQueueError, CreateQueueOutput},
        receive_message::ReceiveMessageError,
    },
    types::{DeleteMessageBatchRequestEntry, QueueAttributeName},
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::Value;

pub async fn create_queue(
    queue_name: &str,
    client: &aws_sdk_sqs::Client,
) -> Result<CreateQueueOutput, SdkError<CreateQueueError>> {
    println!("creating queue: {queue_name}");
    client
        .create_queue()
        .queue_name(queue_name)
        .attributes(QueueAttributeName::FifoQueue, "true")
        .send()
        .await
}

pub async fn purge_queue(
    queue_url: &str,
    client: &aws_sdk_sqs::Client,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("purging queue: {queue_url}");
    client.purge_queue().queue_url(queue_url).send().await?;

    Ok(())
}

pub async fn delete_queue(
    queue_url: &str,
    client: &aws_sdk_sqs::Client,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("deleting queue: {queue_url}");
    client.delete_queue().queue_url(queue_url).send().await?;

    Ok(())
}

pub async fn setup_queue(
    queue_name: &str,
    client: &aws_sdk_sqs::Client,
) -> Result<CreateQueueOutput, SdkError<CreateQueueError>> {
    let queue = create_queue(queue_name, client).await?;
    // Remove any existing messages in the queue.
    let _ = poll_queue::<Value>(queue.queue_url().unwrap(), client).await;

    Ok(queue)
}

pub async fn poll_queue<T: DeserializeOwned>(
    queue_url: &str,
    client: &aws_sdk_sqs::Client,
) -> Result<Vec<T>, Box<dyn std::error::Error>> {
    let result = client
        .receive_message()
        .queue_url(queue_url)
        .max_number_of_messages(10)
        .send()
        .await?;

    let delete_batch_entries = result
        .messages
        .as_ref()
        .unwrap_or(&Vec::new())
        .iter()
        .map(|m| {
            DeleteMessageBatchRequestEntry::builder()
                .id(uuid::Uuid::new_v4().to_string())
                .receipt_handle(m.receipt_handle.clone().unwrap())
                .build()
                .unwrap()
        })
        .collect::<Vec<_>>();

    if !delete_batch_entries.is_empty() {
        client
            .delete_message_batch()
            .queue_url(queue_url)
            .set_entries(Some(delete_batch_entries))
            .send()
            .await?;
    }

    let deserialized_messages = result.messages.map_or(vec![], |messages| {
        messages
            .into_iter()
            .map(|m| m.body.unwrap())
            .collect::<Vec<_>>()
    });

    Ok(deserialized_messages
        .into_iter()
        .map(|m| serde_json::from_str(&m).unwrap())
        .collect())
}
