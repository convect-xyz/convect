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
            'CREATE INDEX idx_tx_configs_5_%s ON %I USING gin (deployment_id, function_id, chain_id, tx_configs);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
