use async_trait::async_trait;
use chrono::Utc;
use shared::sns::Sns;
use std::collections::HashMap;
use tokio::time;

use crate::{
    issue_notifier::{IssueNotifier, ProducerModuleIssue},
    producer::ProducerModule,
};

const PRODUCER_SNS_TOPIC: &str = "arn:aws:sns:eu-west-1:730335604495:all-chains";

#[async_trait]
pub trait Listener {
    async fn listen(&self) -> Result<(), errors::ListenerError>;
}

pub struct ListenerImpl<N: IssueNotifier + 'static, S: Sns + 'static> {
    producer_modules: Vec<Box<dyn ProducerModule>>,
    notifier: N,
    sns_client: S,
}

impl<N: IssueNotifier + 'static, S: Sns + 'static> ListenerImpl<N, S> {
    pub fn new(producer_modules: Vec<Box<dyn ProducerModule>>, notifier: N, sns_client: S) -> Self {
        Self {
            producer_modules,
            notifier,
            sns_client,
        }
    }
}

#[async_trait]
impl<N: IssueNotifier + 'static, S: Sns + 'static> Listener for ListenerImpl<N, S> {
    async fn listen(&self) -> Result<(), errors::ListenerError> {
        let mut interval: time::Interval = time::interval(time::Duration::from_millis(100));

        loop {
            interval.tick().await;

            let mut current_blocks = HashMap::new();
            for module in self.producer_modules.iter() {
                let network = module.network();
                let (current_block, last_updated_at) = module.get_current().await;
                if let Some(current_block) = current_block {
                    current_blocks.insert(network.id, current_block);
                }

                let now = Utc::now();

                if let Some(last_updated_at) = last_updated_at {
                    // If last updated at is more than 60 seconds ago, send an email
                    if now.timestamp() - last_updated_at.timestamp() > 60 {
                        let _ = self
                            .notifier
                            .notify_producer_module_issue(ProducerModuleIssue::BlockNotChanged(
                                network.clone(),
                                current_block,
                                last_updated_at,
                            ))
                            .await;
                    }
                }

                if last_updated_at.is_none() {
                    let _ = self
                        .notifier
                        .notify_producer_module_issue(ProducerModuleIssue::NoCurrentBlock(
                            network.clone(),
                        ))
                        .await;
                }
            }

            self.sns_client
                .publish(
                    PRODUCER_SNS_TOPIC,
                    &serde_json::to_string(&current_blocks).unwrap(),
                )
                .await
                .unwrap();
        }
    }
}

mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum ListenerError {
        #[error("Error sending email")]
        SendEmailError(#[from] resend_rs::Error),
    }
}
