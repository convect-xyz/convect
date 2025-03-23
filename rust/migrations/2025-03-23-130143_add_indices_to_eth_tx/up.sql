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
            'CREATE INDEX idx_eth_tx_sort_%s ON %I (id DESC, created_at DESC, transaction_hash, function_id, chain_id, deployment_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
