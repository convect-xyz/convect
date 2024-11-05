use serde::Serialize;

use crate::tinybird::{TinybirdService, TinybirdServiceImpl};

pub struct EventService<T: TinybirdService> {
    tinybird_service: T,
}

impl EventService<TinybirdServiceImpl> {
    pub fn new_with_defaults() -> Self {
        Self {
            tinybird_service: TinybirdServiceImpl::new(),
        }
    }
}

impl<T: TinybirdService> EventService<T> {
    pub async fn report_events<E: Serialize>(
        &self,
        name: &str,
        events: Vec<E>,
    ) -> Result<(), errors::ReportEventsError> {
        let serialized_events = events
            .into_iter()
            .map(|e| serde_json::to_string(&e))
            .collect::<Result<Vec<_>, _>>()?;

        Ok(self
            .tinybird_service
            .report_events(name, serialized_events)
            .await?)
    }
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum ReportEventsError {
        #[error("Failed to report events")]
        ReportEventsError(#[from] crate::tinybird::errors::TinybirdServiceError),
        #[error("Failed to serialize event")]
        SerializeEventError(#[from] serde_json::Error),
    }
}
