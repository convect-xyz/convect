-- Your SQL goes here
CREATE TABLE processed_transactions (
  id SERIAL PRIMARY KEY,
  transaction_hash VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  status VARCHAR(7) CHECK(status IN ('FAILED', 'SUCCESS')) NOT NULL,
  timestamp TIMESTAMP NOT NULL
);
