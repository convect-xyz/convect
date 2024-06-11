// @generated automatically by Diesel CLI.

diesel::table! {
    invocation (id) {
        id -> Int4,
        #[max_length = 255]
        user_id -> Varchar,
        #[max_length = 255]
        invocation_id -> Varchar,
        timestamp -> Timestamptz,
        num_processed -> Int4,
    }
}

diesel::table! {
    processed_transactions (id) {
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
    }
}

diesel::allow_tables_to_appear_in_same_query!(
    invocation,
    processed_transactions,
);
