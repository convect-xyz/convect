-- Create indices on batch
DO $$
DECLARE
    partition RECORD;
BEGIN
    FOR partition IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'eth_processed_result_p%'
    LOOP
        EXECUTE format(
            'CREATE INDEX idx_batch_id_%s ON %I (processed_batch_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
