use std::{fs::File, path::Path};

use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct ExpectedLog {
    pub address: String,
    pub topics: Vec<String>,
    pub data: String,
    pub log_index: Option<u64>,
}

#[derive(Deserialize, Debug)]
pub struct ExpectedTransaction {
    pub block_number: u64,
    pub block_hash: String,
    pub transaction_index: u64,
    pub transaction_hash: String,
    pub logs: Vec<ExpectedLog>,
}

#[derive(Deserialize, Debug)]
pub struct Expectations {
    pub start_block: u64,
    pub end_block: u64,
    pub transactions: Vec<ExpectedTransaction>,
}
