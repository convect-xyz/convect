use async_trait::async_trait;

const TINYBIRD_API_KEY: &'static str = env!("TINYBIRD_API_KEY");

#[async_trait]
pub trait TinybirdService {
    async fn report_events(
        &self,
        name: &str,
        body: Vec<String>,
    ) -> Result<(), errors::TinybirdServiceError>;
}

pub struct TinybirdServiceImpl {
    client: reqwest::Client,
}

impl TinybirdServiceImpl {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl TinybirdService for TinybirdServiceImpl {
    async fn report_events(
        &self,
        name: &str,
        events: Vec<String>,
    ) -> Result<(), errors::TinybirdServiceError> {
        self.client
            .post(format!(
                "https://api.eu-central-1.aws.tinybird.co/v0/events?name={}",
                name
            ))
            .header("Authorization", format!("Bearer {TINYBIRD_API_KEY}"))
            .body(events.join("\n"))
            .send()
            .await?;

        Ok(())
    }
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum TinybirdServiceError {
        #[error("failed to send events")]
        SendReportError(#[from] reqwest::Error),
    }
}
