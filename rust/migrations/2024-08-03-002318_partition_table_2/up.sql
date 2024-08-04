-- Your SQL goes here
CREATE TABLE processed_transactions_temp_2 (
  id SERIAL NOT NULL,
  handler_id VARCHAR(255) NOT NULL,
  handler_version VARCHAR(255) NOT NULL,
  transaction_hash VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  status VARCHAR(7) CHECK(status IN ('FAILED', 'SUCCESS')) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  batch_id VARCHAR(255) DEFAULT '',
  CONSTRAINT processed_transactions_temp_2_pkey PRIMARY KEY (id, handler_id, handler_version)
) PARTITION BY HASH (handler_id, handler_version);

  -- Create partitions
CREATE TABLE public.processed_transactions_temp_2_p00 PARTITION OF public.processed_transactions_temp_2
    FOR VALUES WITH (MODULUS 10, REMAINDER 0);

CREATE TABLE public.processed_transactions_temp_2_p01 PARTITION OF public.processed_transactions_temp_2
    FOR VALUES WITH (MODULUS 10, REMAINDER 1);

CREATE TABLE public.processed_transactions_temp_2_p02 PARTITION OF public.processed_transactions_temp_2
    FOR VALUES WITH (MODULUS 10, REMAINDER 2);

CREATE TABLE public.processed_transactions_temp_2_p03 PARTITION OF public.processed_transactions_temp_2
    FOR VALUES WITH (MODULUS 10, REMAINDER 3);

CREATE TABLE public.processed_transactions_temp_2_p04 PARTITION OF public.processed_transactions_temp_2
    FOR VALUES WITH (MODULUS 10, REMAINDER 4);

CREATE TABLE public.processed_transactions_temp_2_p05 PARTITION OF public.processed_transactions_temp_2
    FOR VALUES WITH (MODULUS 10, REMAINDER 5);

CREATE TABLE public.processed_transactions_temp_2_p06 PARTITION OF public.processed_transactions_temp_2
    FOR VALUES WITH (MODULUS 10, REMAINDER 6);

CREATE TABLE public.processed_transactions_temp_2_p07 PARTITION OF public.processed_transactions_temp_2
    FOR VALUES WITH (MODULUS 10, REMAINDER 7);

CREATE TABLE public.processed_transactions_temp_2_p08 PARTITION OF public.processed_transactions_temp_2
    FOR VALUES WITH (MODULUS 10, REMAINDER 8);

CREATE TABLE public.processed_transactions_temp_2_p09 PARTITION OF public.processed_transactions_temp_2
    FOR VALUES WITH (MODULUS 10, REMAINDER 9);

-- Create indices
DO $$
DECLARE
    partition RECORD;
BEGIN
    FOR partition IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'processed_transactions_temp_2_p%'
    LOOP
        EXECUTE format(
            'CREATE INDEX idx_handler_id_version_%s ON %I (handler_id, handler_version);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;

INSERT INTO public.processed_transactions_temp_2 (
    id,
    handler_id,
    handler_version,
    transaction_hash,
    "label",
    status,
    "timestamp",
    batch_id
)
SELECT
    id,
    handler_id,
    handler_version,
    transaction_hash,
    "label",
    status,
    "timestamp",
    batch_id
FROM public.processed_transactions;
 
ALTER TABLE processed_transactions RENAME TO processed_transactions_old_2;
ALTER TABLE processed_transactions_temp_2 RENAME TO processed_transactions;
