use serde::Deserialize;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub stripe_customer_id: String,
}

impl Config {
    pub fn new() -> Self {
        Self {
            stripe_customer_id: env::var("STRIPE_CUSTOMER_ID").expect("STRIPE_CUSTOMER_ID not set"),
        }
    }
}
