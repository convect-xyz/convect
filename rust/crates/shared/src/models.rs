use chrono::{DateTime, Utc};
use diesel::prelude::*;

#[derive(Insertable)]
#[diesel(table_name = crate::schema::processed_transactions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct ProcessedTransaction<'a> {
    pub transaction_hash: String,
    pub label: String,
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub handler_id: &'a str,
    pub handler_version: &'a str,
    pub batch_id: &'a str,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::invocation)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Invocation<'a> {
    pub user_id: &'a str,
    pub invocation_id: &'a str,
    pub timestamp: DateTime<Utc>,
    pub num_processed: i32,
}
