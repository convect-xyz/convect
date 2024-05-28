use std::time::SystemTime;

use diesel::prelude::*;

#[derive(Insertable)]
#[diesel(table_name = crate::schema::processed_transactions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct ProcessedTransaction<'a> {
    pub transaction_hash: String,
    pub label: String,
    pub status: String,
    pub timestamp: SystemTime,
    pub handler_id: &'a str,
}
