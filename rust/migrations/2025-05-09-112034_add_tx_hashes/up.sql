DO $$
DECLARE
    partition RECORD;
BEGIN
    FOR partition IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'eth_transaction_p%'
    LOOP
        EXECUTE format(
            'CREATE INDEX idx_comp_on_tx_hash_%s ON %I (deployment_id, function_id, chain_id, transaction_hash);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;



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
            'CREATE INDEX idx_comp_on_tx_hash_%s ON %I (deployment_id, function_id, chain_id, status, transaction_hash);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
