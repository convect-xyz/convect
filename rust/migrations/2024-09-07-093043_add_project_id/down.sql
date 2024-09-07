-- This file should undo anything in `up.sql`
ALTER TABLE processed_transactions DROP COLUMN project_id;
ALTER TABLE invocation DROP COLUMN project_id;
ALTER TABLE reported_metrics DROP COLUMN project_id;
