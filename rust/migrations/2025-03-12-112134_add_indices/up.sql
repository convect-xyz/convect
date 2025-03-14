-- Create indices on processed_batch
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
            'CREATE INDEX idx_d_f_b_c_%s ON %I (deployment_id, function_id, batch_id, chain_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
