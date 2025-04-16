use aws_sdk_s3::error::BoxError;
use futures::Future;
use std::collections::HashMap;

use crate::configuration::RefreshingEnvironmentConfig;

pub trait ProcessedTransactionTelemetry {
    fn record_invocation(
        &self,
        customer_id: String,
        invocation_id: String,
    ) -> impl Future<Output = Result<(), BoxError>>;

    fn record_mb_secs(
        &self,
        customer_id: String,
        invocation_id: String,
        mb_secs: u64,
    ) -> impl Future<Output = Result<(), BoxError>>;
}

pub struct StripeProcessedTransactionTelemetry {
    client: reqwest::Client,
}

impl StripeProcessedTransactionTelemetry {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    async fn record_event(
        &self,
        customer_id: &str,
        event_name: &str,
        meter_name: &str,
        meter_value: u64,
        identifier: &str,
    ) -> Result<(), BoxError> {
        let shared_config = RefreshingEnvironmentConfig::new().await.get_config().await;

        let meter_key = format!("payload[{}]", meter_name);
        let meter_value = meter_value.to_string();

        let mut form_data = HashMap::new();
        form_data.insert("event_name", event_name);
        form_data.insert(&meter_key, &meter_value);
        form_data.insert("payload[stripe_customer_id]", customer_id);
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
    async fn record_invocation(
        &self,
        customer_id: String,
        invocation_id: String,
    ) -> Result<(), BoxError> {
        self.record_event(
            &customer_id,
            "invocations",
            "invocations",
            1,
            &invocation_id,
        )
        .await?;

        Ok(())
    }

    async fn record_mb_secs(
        &self,
        customer_id: String,
        invocation_id: String,
        mb_secs: u64,
    ) -> Result<(), BoxError> {
        self.record_event(
            &customer_id,
            "mb_seconds",
            "mb_seconds",
            mb_secs,
            &invocation_id,
        )
        .await?;

        Ok(())
    }
}
