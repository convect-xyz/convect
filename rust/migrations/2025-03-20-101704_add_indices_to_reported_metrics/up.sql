CREATE INDEX idx_batch_dep_id_func_id_batch_id_chain_id_rep_metric ON reported_metrics (deployment_id, handler_id, handler_version);
CREATE INDEX idx_batch_dep_id_invocation ON invocation (deployment_id);
