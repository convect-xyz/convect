// @generated automatically by Diesel CLI.

diesel::table! {
    eth_processed_result (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_processed_result_p00 (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_processed_result_p01 (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_processed_result_p02 (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_processed_result_p03 (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_processed_result_p04 (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_processed_result_p05 (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_processed_result_p06 (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_processed_result_p07 (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_processed_result_p08 (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_processed_result_p09 (id, transaction_hash) {
        id -> Int4,
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        chain_id -> Int4,
        #[max_length = 255]
        transaction_hash -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_transaction (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    eth_transaction_p00 (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    eth_transaction_p01 (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    eth_transaction_p02 (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    eth_transaction_p03 (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    eth_transaction_p04 (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    eth_transaction_p05 (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    eth_transaction_p06 (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    eth_transaction_p07 (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    eth_transaction_p08 (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    eth_transaction_p09 (transaction_hash, function_id, chain_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
        id -> Int4,
        chain_id -> Int4,
    }
}

diesel::table! {
    invocation (id) {
        id -> Int4,
        #[max_length = 255]
        invocation_id -> Varchar,
        timestamp -> Timestamptz,
        num_processed -> Int4,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_3_p00 (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_3_p01 (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_3_p02 (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_3_p03 (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_3_p04 (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_3_p05 (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_3_p06 (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_3_p07 (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_3_p08 (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_3_p09 (id, handler_id, handler_version) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamptz,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        deployment_id -> Varchar,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    reported_metrics (id) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        handler_version -> Varchar,
        duration_ms -> Float8,
        billed_duration_ms -> Int8,
        memory_size_mb -> Int8,
        max_memory_used_mb -> Int8,
        init_duration_ms -> Nullable<Float8>,
        restore_duration_ms -> Nullable<Float8>,
        #[max_length = 255]
        deployment_id -> Varchar,
        timestamp -> Timestamptz,
        project_id -> Nullable<Int4>,
    }
}

diesel::allow_tables_to_appear_in_same_query!(
    eth_processed_result,
    eth_processed_result_p00,
    eth_processed_result_p01,
    eth_processed_result_p02,
    eth_processed_result_p03,
    eth_processed_result_p04,
    eth_processed_result_p05,
    eth_processed_result_p06,
    eth_processed_result_p07,
    eth_processed_result_p08,
    eth_processed_result_p09,
    eth_transaction,
    eth_transaction_p00,
    eth_transaction_p01,
    eth_transaction_p02,
    eth_transaction_p03,
    eth_transaction_p04,
    eth_transaction_p05,
    eth_transaction_p06,
    eth_transaction_p07,
    eth_transaction_p08,
    eth_transaction_p09,
    invocation,
    processed_transactions,
    processed_transactions_temp_3_p00,
    processed_transactions_temp_3_p01,
    processed_transactions_temp_3_p02,
    processed_transactions_temp_3_p03,
    processed_transactions_temp_3_p04,
    processed_transactions_temp_3_p05,
    processed_transactions_temp_3_p06,
    processed_transactions_temp_3_p07,
    processed_transactions_temp_3_p08,
    processed_transactions_temp_3_p09,
    reported_metrics,
);
