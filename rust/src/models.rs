use std::time::SystemTime;

use diesel::prelude::*;

#[derive(Queryable, Selectable, Insertable)]
#[diesel(table_name = crate::schema::processed_transactions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct ProcessedTransaction {
    pub transaction_hash: String,
    pub label: String,
    pub status: String,
    pub timestamp: SystemTime,
}
