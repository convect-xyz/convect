-- Your SQL goes here
ALTER TABLE processed_transactions ADD COLUMN project_id INTEGER;
ALTER TABLE invocation ADD COLUMN project_id INTEGER;
ALTER TABLE reported_metrics ADD COLUMN project_id INTEGER;
