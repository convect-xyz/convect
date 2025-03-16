-- Create indices on batch
DO $$
DECLARE
    partition RECORD;
BEGIN
    FOR partition IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'batch_p%'
    LOOP
        EXECUTE format(
            'CREATE INDEX idx_batch_id_%s ON %I (batch_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
