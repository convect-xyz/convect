-- Add status column  with enum 'SUCCESS' or 'FAILED'
ALTER TABLE processed_transaction ADD COLUMN status VARCHAR(255);

-- Add status column  with enum 'SUCCESS' or 'FAILED'
ALTER TABLE processed_transaction ADD CONSTRAINT check_status_enum CHECK (status IN ('SUCCESS', 'FAILURE'));
