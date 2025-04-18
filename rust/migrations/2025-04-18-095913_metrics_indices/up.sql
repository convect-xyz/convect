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
            'CREATE INDEX idx_project_id_created_at_%s ON %I (project_id, created_at);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;


CREATE INDEX idx_project_id_timestamp ON reported_metrics (project_id, timestamp);
