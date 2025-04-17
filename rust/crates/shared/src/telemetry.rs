use futures::Future;
use std::collections::HashMap;

use crate::configuration::RefreshingEnvironmentConfig;

pub trait ProcessedTransactionTelemetry {
    fn record_invocation(
        &self,
        invocation_id: String,
    ) -> impl Future<Output = Result<(), errors::TelemetryError>>;

    fn record_mb_secs(
        &self,
        invocation_id: String,
        mb_secs: u64,
    ) -> impl Future<Output = Result<(), errors::TelemetryError>>;

    fn record_transactions_fetched(
        &self,
        batch_id: String,
        transactions_fetched: u64,
    ) -> impl Future<Output = Result<(), errors::TelemetryError>>;
}

pub struct StripeProcessedTransactionTelemetry {
    client: reqwest::Client,
    stripe_customer_id: String,
}

impl StripeProcessedTransactionTelemetry {
    pub fn new(stripe_customer_id: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            stripe_customer_id,
        }
    }

    async fn record_event(
        &self,
        event_name: &str,
        meter_key: &str,
        meter_value: u64,
        identifier: &str,
    ) -> Result<(), errors::TelemetryError> {
        let shared_config = RefreshingEnvironmentConfig::new().await.get_config().await;

        let meter_key = format!("payload[{}]", meter_key);
        let meter_value = meter_value.to_string();

        let mut form_data = HashMap::new();
        form_data.insert("event_name", event_name);
        form_data.insert(&meter_key, &meter_value);
        form_data.insert(
            "payload[stripe_customer_id]",
            self.stripe_customer_id.as_str(),
        );
        form_data.insert("identifier", identifier);

        self.client
            .post("https://api.stripe.com/v1/billing/meter_events")
            .form(&form_data)
            .basic_auth(shared_config.stripe.api_key.clone(), None::<String>)
            .send()
            .await?;

        Ok(())
    }
}

impl ProcessedTransactionTelemetry for StripeProcessedTransactionTelemetry {
    async fn record_invocation(&self, invocation_id: String) -> Result<(), errors::TelemetryError> {
        self.record_event("invocations", "invocations", 1, &invocation_id)
            .await?;

        Ok(())
    }

    async fn record_mb_secs(
        &self,
        invocation_id: String,
        mb_secs: u64,
    ) -> Result<(), errors::TelemetryError> {
        self.record_event("mb_seconds", "value", mb_secs, &invocation_id)
            .await?;

        Ok(())
    }

    async fn record_transactions_fetched(
        &self,
        batch_id: String,
        transactions_fetched: u64,
    ) -> Result<(), errors::TelemetryError> {
        self.record_event(
            "transactions_fetched",
            "value",
            transactions_fetched,
            &batch_id,
        )
        .await?;
        Ok(())
    }
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum TelemetryError {
        #[error("Failed to record event: {0}")]
        StripeEventError(#[from] reqwest::Error),
    }
}
