DO $$
DECLARE
    partition RECORD;
BEGIN
    FOR partition IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'processed_transactions_temp_3_p%'
    LOOP
        EXECUTE format(
            'CREATE INDEX idx_tx_hash%s ON %I (transaction_hash);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
