-- Your SQL goes here

CREATE TABLE processed_transaction_new (
  id SERIAL NOT NULL,
  handler VARCHAR(255) NOT NULL,
  status VARCHAR(7) CHECK(status IN ('FAILED', 'SUCCESS')),
  processed_batch_id VARCHAR(255) DEFAULT '',
  transaction_hash VARCHAR(255) NOT NULL,
  deployment_id VARCHAR(255) NOT NULL,
  function_id VARCHAR(255) NOT NULL,
  chain_id INTEGER NOT NULL,
  processed_log_indices INTEGER[] NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  CONSTRAINT processed_transaction_pkey PRIMARY KEY (id, deployment_id)
) PARTITION BY HASH (deployment_id);

CREATE TABLE public.processed_transaction_new_p00 PARTITION OF public.processed_transaction_new
    FOR VALUES WITH (MODULUS 10, REMAINDER 0);

CREATE TABLE public.processed_transaction_new_p01 PARTITION OF public.processed_transaction_new
    FOR VALUES WITH (MODULUS 10, REMAINDER 1);

CREATE TABLE public.processed_transaction_new_p02 PARTITION OF public.processed_transaction_new
    FOR VALUES WITH (MODULUS 10, REMAINDER 2);

CREATE TABLE public.processed_transaction_new_p03 PARTITION OF public.processed_transaction_new
    FOR VALUES WITH (MODULUS 10, REMAINDER 3);

CREATE TABLE public.processed_transaction_new_p04 PARTITION OF public.processed_transaction_new
    FOR VALUES WITH (MODULUS 10, REMAINDER 4);

CREATE TABLE public.processed_transaction_new_p05 PARTITION OF public.processed_transaction_new
    FOR VALUES WITH (MODULUS 10, REMAINDER 5);

CREATE TABLE public.processed_transaction_new_p06 PARTITION OF public.processed_transaction_new
    FOR VALUES WITH (MODULUS 10, REMAINDER 6);

CREATE TABLE public.processed_transaction_new_p07 PARTITION OF public.processed_transaction_new
    FOR VALUES WITH (MODULUS 10, REMAINDER 7);

CREATE TABLE public.processed_transaction_new_p08 PARTITION OF public.processed_transaction_new
    FOR VALUES WITH (MODULUS 10, REMAINDER 8);

CREATE TABLE public.processed_transaction_new_p09 PARTITION OF public.processed_transaction_new
    FOR VALUES WITH (MODULUS 10, REMAINDER 9);


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
            'CREATE INDEX idx_dep_id_fn_id_chain_id_%s ON %I (deployment_id, function_id, chain_id);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;


INSERT INTO processed_transaction_new (id, handler, status, processed_batch_id, transaction_hash, deployment_id, function_id, chain_id, processed_log_indices, timestamp)
SELECT 
  id, 
  handler, 
  status, 
  processed_batch_id, 
  transaction_hash, 
  deployment_id, 
  function_id, 
  chain_id, 
  processed_log_indices, 
  timestamp
 FROM processed_transaction;
