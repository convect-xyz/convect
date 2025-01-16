DROP TABLE eth_processed_result;


ALTER TABLE eth_transaction ADD COLUMN id SERIAL NOT NULL;
ALTER TABLE eth_transaction DROP CONSTRAINT eth_transaction_pkey;
ALTER TABLE eth_transaction ADD CONSTRAINT eth_transaction_pkey PRIMARY KEY (id, function_id);

CREATE TABLE eth_processed_result (
  id SERIAL NOT NULL,
  handler VARCHAR(255) NOT NULL,
  status VARCHAR(7) CHECK(status IN ('FAILED', 'SUCCESS')) NOT NULL,
  batch_id VARCHAR(255) DEFAULT '',
  eth_transaction_id INTEGER NOT NULL,
  deployment_id VARCHAR(255) NOT NULL,
  function_id VARCHAR(255) NOT NULL,
  transaction_hash VARCHAR(255) NOT NULL,
  processed_log_indices INTEGER[] NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  CONSTRAINT eth_processed_result_pkey PRIMARY KEY (id, transaction_hash),
  CONSTRAINT eth_processed_result_transaction_hash_fkey FOREIGN KEY (eth_transaction_id, function_id) REFERENCES eth_transaction (id, function_id) ON DELETE CASCADE
) PARTITION BY HASH (transaction_hash);
