use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use resend_rs::types::CreateEmailBaseOptions;
use shared::{networks::SupportedNetwork, resend::ResendClient};
use tokio::sync::Mutex;

const FROM_EMAIL: &str = "notification@convect.xyz";
const TO_EMAIL: &str = "kayakthedev@gmail.com";

#[async_trait]
pub trait IssueNotifier: Send + Sync {
    async fn notify_producer_module_issue(
        &self,
        issue: ProducerModuleIssue,
    ) -> Result<(), errors::IssueNotifierError>;
}

pub enum ProducerModuleIssue {
    BlockNotChanged(SupportedNetwork, Option<u64>, DateTime<Utc>),
    NoCurrentBlock(SupportedNetwork),
}

pub struct IssueNotifierImpl<T: ResendClient> {
    last_sent_at: Arc<Mutex<Option<DateTime<Utc>>>>,
    resend_client: Arc<T>,
}

impl<T: ResendClient> IssueNotifierImpl<T> {
    pub fn new(resend_client: T) -> Self {
        Self {
            resend_client: Arc::new(resend_client),
            last_sent_at: Arc::new(Mutex::new(None)),
        }
    }
}

#[async_trait]
impl<T: ResendClient> IssueNotifier for IssueNotifierImpl<T> {
    async fn notify_producer_module_issue(
        &self,
        issue: ProducerModuleIssue,
    ) -> Result<(), errors::IssueNotifierError> {
        if let Some(last_sent_at) = self.last_sent_at.lock().await.clone() {
            // If last sent at is less than 10 minutes ago, don't send again
            if Utc::now().timestamp() - last_sent_at.timestamp() < 600 {
                return Ok(());
            }
        }

        let message = match issue {
            ProducerModuleIssue::BlockNotChanged(network, last_block, last_changed_at) => {
                format!(
                    "[{:?}] Block not changed since {:?}. Last block: {:?}",
                    network.name, last_changed_at, last_block
                )
            }
            ProducerModuleIssue::NoCurrentBlock(network) => {
                format!("[{:?}] No current block", network.name)
            }
        };

        tracing::info!(message);

        self.resend_client
            .send_email(
                CreateEmailBaseOptions::new(
                    FROM_EMAIL,
                    vec![TO_EMAIL.to_string()],
                    "Producer Error",
                )
                .with_text(message.as_str()),
            )
            .await?;

        self.last_sent_at.lock().await.replace(Utc::now());

        Ok(())
    }
}

pub mod errors {
    use shared::resend;
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum IssueNotifierError {
        #[error("Error sending email")]
        SendEmailError(#[from] resend_rs::Error),
        #[error("Resend client error")]
        ResendClientError(#[from] resend::errors::ResendError),
    }
}
