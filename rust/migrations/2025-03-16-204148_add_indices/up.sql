-- Your SQL goes here
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
            'CREATE INDEX idx_batch_dep_id_func_id_batch_id_chain_id_%s ON %I (deployment_id, function_id, batch_id, chain_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
