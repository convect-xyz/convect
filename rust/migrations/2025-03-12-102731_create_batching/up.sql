-- Your SQL goes here
CREATE TABLE processed_batch (
  id SERIAL NOT NULL,
  batch_id VARCHAR(255) NOT NULL,
  deployment_id VARCHAR(255) NOT NULL,
  function_id VARCHAR(255) NOT NULL,
  status VARCHAR(7) CHECK(status IN ('FAILED', 'SUCCESS')) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  CONSTRAINT processed_batch_pkey PRIMARY KEY (id, deployment_id, function_id, batch_id)
) PARTITION BY HASH (deployment_id);

CREATE TABLE public.processed_batch_p00 PARTITION OF public.processed_batch
    FOR VALUES WITH (MODULUS 10, REMAINDER 0);

CREATE TABLE public.processed_batch_p01 PARTITION OF public.processed_batch
    FOR VALUES WITH (MODULUS 10, REMAINDER 1);

CREATE TABLE public.processed_batch_p02 PARTITION OF public.processed_batch
    FOR VALUES WITH (MODULUS 10, REMAINDER 2);

CREATE TABLE public.processed_batch_p03 PARTITION OF public.processed_batch
    FOR VALUES WITH (MODULUS 10, REMAINDER 3);

CREATE TABLE public.processed_batch_p04 PARTITION OF public.processed_batch
    FOR VALUES WITH (MODULUS 10, REMAINDER 4);

CREATE TABLE public.processed_batch_p05 PARTITION OF public.processed_batch
    FOR VALUES WITH (MODULUS 10, REMAINDER 5);

CREATE TABLE public.processed_batch_p06 PARTITION OF public.processed_batch
    FOR VALUES WITH (MODULUS 10, REMAINDER 6);

CREATE TABLE public.processed_batch_p07 PARTITION OF public.processed_batch
    FOR VALUES WITH (MODULUS 10, REMAINDER 7);

CREATE TABLE public.processed_batch_p08 PARTITION OF public.processed_batch
    FOR VALUES WITH (MODULUS 10, REMAINDER 8);

CREATE TABLE public.processed_batch_p09 PARTITION OF public.processed_batch
    FOR VALUES WITH (MODULUS 10, REMAINDER 9);

-- Create indices on processed_batch
DO $$
DECLARE
    partition RECORD;
BEGIN
    FOR partition IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'processed_batch_p%'
    LOOP
        EXECUTE format(
            'CREATE INDEX idx_deployment_id_function_id_batch_id_%s ON %I (deployment_id, function_id, batch_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;
