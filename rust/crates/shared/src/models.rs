use chrono::{DateTime, Utc};
use diesel::prelude::*;

#[derive(Insertable)]
#[diesel(table_name = crate::schema::processed_transactions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct ProcessedTransaction {
    pub project_id: i32,
    pub transaction_hash: String,
    pub label: String,
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub handler_id: String,
    pub handler_version: String,
    pub batch_id: String,
    pub deployment_id: String,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::invocation)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Invocation {
    pub project_id: i32,
    pub invocation_id: String,
    pub timestamp: DateTime<Utc>,
    pub num_processed: i32,
    pub deployment_id: String,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::reported_metrics)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Metric {
    pub project_id: i32,
    pub handler_id: String,
    pub handler_version: String,
    pub duration_ms: f64,
    pub billed_duration_ms: i64,
    pub memory_size_mb: i64,
    pub max_memory_used_mb: i64,
    pub init_duration_ms: Option<f64>,
    pub restore_duration_ms: Option<f64>,
    pub deployment_id: String,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::eth_transaction)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct EthTransaction {
    pub transaction_hash: String,
    pub function_id: String,
    pub deployment_id: String,
    pub created_at: DateTime<Utc>,
    pub block_timestamp: DateTime<Utc>,
}
