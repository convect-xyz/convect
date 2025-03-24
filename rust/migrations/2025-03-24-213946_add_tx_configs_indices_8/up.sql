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
            'CREATE INDEX idx_tx_configs_8_%s ON %I USING gin (tx_configs gin__int_ops);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
