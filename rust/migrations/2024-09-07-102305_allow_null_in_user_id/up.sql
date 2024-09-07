-- Your SQL goes here
ALTER TABLE processed_transactions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE invocation ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE reported_metrics ALTER COLUMN user_id DROP NOT NULL;
