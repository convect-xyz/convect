-- Your SQL goes here
ALTER TABLE reported_metrics
ADD COLUMN user_id VARCHAR DEFAULT 'b39e5b20-b22c-44eb-bee2-95132d484b42' NOT NULL;


ALTER TABLE processed_transactions
ADD COLUMN user_id VARCHAR DEFAULT 'b39e5b20-b22c-44eb-bee2-95132d484b42' NOT NULL;
