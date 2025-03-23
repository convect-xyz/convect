-- Create indices on batch
DO $$
DECLARE
    partition RECORD;
BEGIN
    FOR partition IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'processed_batch_p%'
    LOOP
        EXECUTE format(
            'CREATE INDEX idx_dep_chain_fun_%s ON %I (deployment_id, chain_id, function_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
