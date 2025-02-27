-- Create indices on eth_processed_result
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
            'CREATE INDEX idx_deployment_id_function_id_chain_id_%s ON %I (deployment_id, function_id, chain_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
