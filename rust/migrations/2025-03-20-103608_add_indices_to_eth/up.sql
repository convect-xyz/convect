-- Your SQL goes here
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
            'CREATE INDEX idx_id_%s ON %I (id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
