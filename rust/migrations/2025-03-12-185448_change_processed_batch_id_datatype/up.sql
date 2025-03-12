-- Change processed_batch_id datatype to serial
ALTER TABLE processed_transaction DROP COLUMN processed_batch_id;
ALTER TABLE processed_transaction ADD COLUMN processed_batch_id INTEGER;
