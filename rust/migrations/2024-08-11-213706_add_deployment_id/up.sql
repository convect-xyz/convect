-- Your SQL goes here
ALTER TABLE processed_transactions ADD COLUMN deployment_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE reported_metrics ADD COLUMN deployment_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE invocation ADD COLUMN deployment_id VARCHAR(255) NOT NULL DEFAULT '';
