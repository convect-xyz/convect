CREATE TABLE reported_metrics (
  id SERIAL PRIMARY KEY,
  handler_id VARCHAR(255) NOT NULL,
  handler_version VARCHAR(255) NOT NULL,
  duration_ms DOUBLE PRECISION NOT NULL,
  billed_duration_ms BIGINT NOT NULL,
  memory_size_mb BIGINT NOT NULL,
  max_memory_used_mb BIGINT NOT NULL,
  init_duration_ms DOUBLE PRECISION,
  restore_duration_ms DOUBLE PRECISION
);
