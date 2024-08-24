use async_trait::async_trait;
use resend_rs::types::{CreateEmailBaseOptions, CreateEmailResponse};
use resend_rs::{Resend, Result};

#[async_trait]
pub trait ResendClient {
    async fn send_email(
        &self,
        email: CreateEmailBaseOptions,
    ) -> Result<CreateEmailResponse, errors::ResendError>;
}

pub struct ResendClientImpl {
    client: Resend,
}

impl ResendClientImpl {
    pub fn new(api_key: &str) -> ResendClientImpl {
        let client = Resend::new(api_key);
        ResendClientImpl { client }
    }
}

#[async_trait]
impl ResendClient for ResendClientImpl {
    async fn send_email(
        &self,
        email: CreateEmailBaseOptions,
    ) -> Result<CreateEmailResponse, errors::ResendError> {
        Ok(self.client.emails.send(email).await?)
    }
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum ResendError {
        #[error("Error sending email")]
        SendEmailError(#[from] resend_rs::Error),
    }
}
