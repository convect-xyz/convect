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
            'DROP INDEX idx_tx_configs_3_%s;',
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
        WHERE tablename LIKE 'eth_transaction_p%'
    LOOP
        EXECUTE format(
            'DROP INDEX idx_tx_configs_2_%s;',
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
        WHERE tablename LIKE 'eth_transaction_p%'
    LOOP
        EXECUTE format(
            'DROP INDEX idx_tx_configs_%s;',
            partition.tablename
        );
    END LOOP;
END $$;
