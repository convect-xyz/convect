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
            'CREATE INDEX idx_eth_transaction_sort_%s ON %I (id DESC, created_at DESC);',
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
            'CREATE INDEX idx_deployment_id_%s ON %I (deployment_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;


-- DO $$
-- DECLARE
--     partition RECORD;
-- BEGIN
--     FOR partition IN
--         SELECT tablename
--         FROM pg_tables
--         WHERE tablename LIKE 'processed_transaction_new_p%'
--     LOOP
--         EXECUTE format(
--             'CREATE INDEX idx_tx_hash__p_batch_id_status_dep_id_%s ON %I (transaction_hash, processed_batch_id, status, deployment_id);',
--             partition.tablename,
--             partition.tablename
--         );
--     END LOOP;
-- END $$;
