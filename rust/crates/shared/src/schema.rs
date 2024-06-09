// @generated automatically by Diesel CLI.

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
