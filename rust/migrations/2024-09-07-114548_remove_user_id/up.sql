-- Your SQL goes here
ALTER TABLE processed_transactions DROP COLUMN user_id;
ALTER TABLE invocation DROP COLUMN user_id;
ALTER TABLE reported_metrics DROP COLUMN user_id;
