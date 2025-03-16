ALTER TABLE processed_transaction DROP CONSTRAINT check_status_enum;
ALTER TABLE processed_transaction 
ADD CONSTRAINT check_status_enum CHECK (status IN ('SUCCESS', 'FAILED'));
