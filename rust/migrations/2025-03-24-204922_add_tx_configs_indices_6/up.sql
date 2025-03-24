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
            'CREATE INDEX idx_tx_configs_6_%s ON %I USING btree (deployment_id, function_id, chain_id) INCLUDE (tx_configs);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
