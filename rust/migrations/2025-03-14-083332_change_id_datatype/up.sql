ALTER TABLE processed_batch ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE processed_transaction ALTER COLUMN processed_batch_id TYPE VARCHAR(255);
