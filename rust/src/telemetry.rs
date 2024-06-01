use aws_sdk_s3::error::BoxError;

pub trait ProcessedTransactionTelemetry {
    async fn record_invocation(
        &self,
        invocation_id: String,
        num_processed: u64,
    ) -> Result<(), BoxError>;
}

pub mod stripe {
    use std::env;

    use aws_sdk_s3::error::BoxError;
    use serde_json::json;

    use super::ProcessedTransactionTelemetry;

    pub struct StripeProcessedTransactionTelemetry {
        client: reqwest::Client,
        customer_id: String,
    }

    impl StripeProcessedTransactionTelemetry {
        pub fn from_env() -> Self {
            Self {
                client: reqwest::Client::new(),
                customer_id: env::var("STRIPE_CUSTOMER_ID")
                    .expect("STRIPE_CUSTOMER_ID should be set"),
            }
        }
    }

    impl ProcessedTransactionTelemetry for StripeProcessedTransactionTelemetry {
        async fn record_invocation(
            &self,
            invocation_id: String,
            num_processed: u64,
        ) -> Result<(), BoxError> {
            let r = self.client
                .post("https://api.stripe.com/v1/billing/meter_events")
                .form(&json!({
                  "event_name": "transactions_processed",
                  "payload": {
                    "transactions": num_processed.to_string(),
                    "stripe_customer_id": &self.customer_id
                  },
                  "identifier": invocation_id
                }))
                .basic_auth("sk_test_51PMr2V2LJct0ubJ3nTq8p9kTNpPCBHcvzv8RMWmLHdYLFKgo8wMnNUu5bX7Zya2DmyopOsfqxpIosTXKHcYRe7Wl00ey4kK1D8", None::<String>)
                .send()
                .await?;

            println!("{:?}", r.text().await.unwrap());

            Ok(())
        }
    }
}
