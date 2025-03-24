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
            'CREATE INDEX idx_tx_hash_%s ON %I USING gin (transaction_hash gin_trgm_ops);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
