-- Your SQL goes here
-- Create indices on eth_transaction


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
            'CREATE INDEX idx_processed_batch_id%s ON %I (processed_batch_id);',
            partition.tablename,
            partition.tablename
        );
        EXECUTE format(
            'CREATE INDEX idx_dep_id_func_id_chain_id_tx_hash_processed_batch_id%s ON %I (deployment_id, function_id, chain_id, transaction_hash, processed_batch_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
