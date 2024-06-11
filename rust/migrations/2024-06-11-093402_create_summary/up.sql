-- Your SQL goes here
CREATE TABLE invocation (
  "id" SERIAL PRIMARY KEY,
  "user_id" VARCHAR(255) NOT NULL,
  "invocation_id" VARCHAR(255) NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL,
  "num_processed" INTEGER NOT NULL
);
