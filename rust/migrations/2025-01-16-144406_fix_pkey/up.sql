DROP TABLE eth_processed_result;

ALTER TABLE eth_transaction DROP CONSTRAINT eth_transaction_pkey;
ALTER TABLE eth_transaction ADD CONSTRAINT eth_transaction_pkey PRIMARY KEY (transaction_hash, function_id, chain_id, deployment_id);

CREATE TABLE eth_processed_result (
  id SERIAL NOT NULL,
  handler VARCHAR(255) NOT NULL,
  status VARCHAR(7) CHECK(status IN ('FAILED', 'SUCCESS')) NOT NULL,
  batch_id VARCHAR(255) DEFAULT '',
  -- fkey
  deployment_id VARCHAR(255) NOT NULL,
  function_id VARCHAR(255) NOT NULL,
  chain_id INTEGER NOT NULL,
  transaction_hash VARCHAR(255) NOT NULL,
  -- fkey
  processed_log_indices INTEGER[] NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  CONSTRAINT eth_processed_result_pkey PRIMARY KEY (id, transaction_hash),
  CONSTRAINT eth_processed_result_transaction_hash_fkey FOREIGN KEY (deployment_id, function_id, chain_id, transaction_hash) REFERENCES eth_transaction (deployment_id, function_id, chain_id, transaction_hash) ON DELETE CASCADE
) PARTITION BY HASH (transaction_hash);
