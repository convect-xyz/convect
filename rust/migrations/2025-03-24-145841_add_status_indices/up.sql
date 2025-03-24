-- Create indices on processed transaction
DO $$
DECLARE
    partition RECORD;
BEGIN
    FOR partition IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'processed_transaction_new_p%'
    LOOP
        EXECUTE format(
            'CREATE INDEX idx_dep_fn_id_chain_id_status_%s ON %I (deployment_id, function_id, chain_id, status);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
