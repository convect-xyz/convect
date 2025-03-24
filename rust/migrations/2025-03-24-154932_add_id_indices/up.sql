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
            'CREATE INDEX idx_dep_id_fn_id_chain_id_%s ON %I USING gin (deployment_id, function_id, chain_id, id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
