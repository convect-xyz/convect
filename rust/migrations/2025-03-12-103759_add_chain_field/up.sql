-- Your SQL goes here
ALTER TABLE processed_batch ADD COLUMN chain_id INTEGER NOT NULL;
ALTER TABLE eth_transaction ADD COLUMN batch_id VARCHAR(255) DEFAULT '';
