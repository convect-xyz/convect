-- Your SQL goes here
CREATE TABLE eth_transaction (
  transaction_hash VARCHAR(255) NOT NULL,
  function_id VARCHAR(255) NOT NULL,
  deployment_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  block_timestamp TIMESTAMPTZ NOT NULL,
  CONSTRAINT eth_transaction_pkey PRIMARY KEY (transaction_hash, function_id, deployment_id)
) PARTITION BY HASH (function_id);


CREATE TABLE eth_processed_result (
  handler VARCHAR(255) NOT NULL,
  status VARCHAR(7) CHECK(status IN ('FAILED', 'SUCCESS')) NOT NULL,
  batch_id VARCHAR(255) DEFAULT '',
  transaction_hash VARCHAR(255) NOT NULL,
  deployment_id VARCHAR(255) NOT NULL,
  function_id VARCHAR(255) NOT NULL,
  processed_log_indices INTEGER[] NOT NULL,
  CONSTRAINT eth_processed_result_pkey PRIMARY KEY (transaction_hash, function_id, deployment_id, handler),
  timestamp TIMESTAMPTZ NOT NULL,
  CONSTRAINT eth_processed_result_transaction_hash_fkey FOREIGN KEY (transaction_hash, function_id, deployment_id) REFERENCES eth_transaction (transaction_hash, function_id, deployment_id) ON DELETE CASCADE
) PARTITION BY HASH (transaction_hash);
