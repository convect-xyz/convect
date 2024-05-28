// @generated automatically by Diesel CLI.

diesel::table! {
    base_cards (id) {
        id -> Int4,
        on_chain_id -> Int8,
        #[max_length = 256]
        name -> Nullable<Varchar>,
        #[max_length = 256]
        image_uri -> Nullable<Varchar>,
        hp -> Int8,
        pwr -> Int8,
        def -> Int8,
        spd -> Int8,
        unit -> Int4,
        cardType -> Int4,
        cardTier -> Int4,
    }
}

diesel::table! {
    minted_cards (id) {
        id -> Int4,
        on_chain_id -> Int8,
        #[max_length = 256]
        owner -> Nullable<Varchar>,
        hp -> Int8,
        pwr -> Int8,
        def -> Int8,
        spd -> Int8,
        unit -> Int4,
        score -> Int4,
        tier -> Int4,
        level -> Int8,
        base_card_id -> Int8,
    }
}

diesel::table! {
    processed_transactions (id) {
        id -> Int4,
        #[max_length = 255]
        handler_id -> Varchar,
        #[max_length = 255]
        transaction_hash -> Varchar,
        #[max_length = 255]
        label -> Varchar,
        #[max_length = 7]
        status -> Varchar,
        timestamp -> Timestamp,
    }
}

diesel::allow_tables_to_appear_in_same_query!(
    base_cards,
    minted_cards,
    processed_transactions,
);
