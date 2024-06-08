use aws_sdk_s3::error::BoxError;

pub trait ProcessedTransactionTelemetry {
    async fn record_invocation(
        &self,
        invocation_id: String,
        num_processed: u64,
    ) -> Result<(), BoxError>;
}

pub mod stripe {
    use std::{collections::HashMap, env};

    use aws_sdk_s3::error::BoxError;

    use super::ProcessedTransactionTelemetry;

    pub struct ProcessedTransactionTelemetry {
        client: reqwest::Client,
        customer_id: String,
    }

    impl ProcessedTransactionTelemetry {
        pub fn from_env() -> Self {
            Self {
                client: reqwest::Client::new(),
                customer_id: env::var("STRIPE_CUSTOMER_ID")
                    .expect("STRIPE_CUSTOMER_ID should be set"),
            }
        }
    }

    impl super::ProcessedTransactionTelemetry for ProcessedTransactionTelemetry {
        async fn record_invocation(
            &self,
            invocation_id: String,
            num_processed: u64,
        ) -> Result<(), BoxError> {
            let num_processed_as_string = num_processed.to_string();
            let mut form_data = HashMap::new();
            form_data.insert("event_name", "transactions_processed");
            form_data.insert("payload[transactions]", &num_processed_as_string);
            form_data.insert("payload[stripe_customer_id]", &self.customer_id);
            form_data.insert("identifier", &invocation_id);

            let r = self.client
                .post("https://api.stripe.com/v1/billing/meter_events")
                .form(&form_data)
                .basic_auth("sk_test_51PMr2V2LJct0ubJ3nTq8p9kTNpPCBHcvzv8RMWmLHdYLFKgo8wMnNUu5bX7Zya2DmyopOsfqxpIosTXKHcYRe7Wl00ey4kK1D8", None::<String>)
                .send()
                .await?;

            println!("{:?}", r.text().await.unwrap());

            Ok(())
        }
    }
}
