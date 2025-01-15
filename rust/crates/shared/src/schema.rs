// @generated automatically by Diesel CLI.

diesel::table! {
    eth_processed_result (transaction_hash, function_id, deployment_id, handler) {
        #[max_length = 255]
        handler -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        #[max_length = 255]
        batch_id -> Nullable<Varchar>,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        processed_log_indices -> Array<Nullable<Int4>>,
        timestamp -> Timestamptz,
    }
}

diesel::table! {
    eth_transaction (transaction_hash, function_id, deployment_id) {
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        function_id -> Varchar,
        #[max_length = 255]
        deployment_id -> Varchar,
        created_at -> Timestamptz,
        block_timestamp -> Timestamptz,
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
    eth_transaction,
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
