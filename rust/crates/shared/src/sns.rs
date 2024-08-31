use async_trait::async_trait;

#[async_trait]
pub trait Sns: Send + Sync {
    async fn publish(&self, topic: &str, message: &str) -> Result<(), aws_sdk_sns::Error>;
}

#[async_trait]
impl Sns for aws_sdk_sns::Client {
    async fn publish(&self, topic: &str, message: &str) -> Result<(), aws_sdk_sns::Error> {
        self.publish()
            .topic_arn(topic)
            .message(message)
            .send()
            .await?;

        Ok(())
    }
}
