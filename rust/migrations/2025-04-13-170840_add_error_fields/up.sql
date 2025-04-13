-- Your SQL goes here
ALTER TABLE processed_batch ADD COLUMN error_message TEXT;
ALTER TABLE processed_batch ADD COLUMN error_stacktrace TEXT;
