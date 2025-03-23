-- Your SQL goes here
-- Create indices on eth_transaction


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
            'CREATE INDEX idx_eth_tx_optimized_%s ON %I (deployment_id, function_id, chain_id, id DESC, created_at DESC);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
