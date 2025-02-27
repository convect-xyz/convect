use config::{Config, ConfigError, Environment};
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]

pub struct Redis {
    pub url: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct SharedConfig {
    pub redis: Redis,
}

impl SharedConfig {
    pub fn new() -> Result<Self, ConfigError> {
        let s = Config::builder()
            .add_source(Environment::with_prefix("CONFIG").separator("__"))
            .build()?;

        s.try_deserialize()
    }
}
