// @generated automatically by Diesel CLI.

diesel::table! {
    invocation (id) {
        id -> Int4,
        #[max_length = 255]
        user_id -> Nullable<Varchar>,
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
        user_id -> Nullable<Varchar>,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_old (id) {
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
    }
}

diesel::table! {
    processed_transactions_old_2 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_old_3 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_2_p00 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_2_p01 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_2_p02 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_2_p03 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_2_p04 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_2_p05 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_2_p06 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_2_p07 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_2_p08 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_2_p09 (id, handler_id, handler_version) {
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
        user_id -> Nullable<Varchar>,
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
        user_id -> Nullable<Varchar>,
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
        user_id -> Nullable<Varchar>,
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
        user_id -> Nullable<Varchar>,
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
        user_id -> Nullable<Varchar>,
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
        user_id -> Nullable<Varchar>,
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
        user_id -> Nullable<Varchar>,
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
        user_id -> Nullable<Varchar>,
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
        user_id -> Nullable<Varchar>,
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
        user_id -> Nullable<Varchar>,
        project_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processed_transactions_temp_p00 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p01 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p02 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p03 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p04 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p05 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p06 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p07 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p08 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p09 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p10 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p11 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p12 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p13 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p14 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p15 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p16 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p17 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p18 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p19 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p20 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p21 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p22 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p23 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p24 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p25 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p26 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p27 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p28 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p29 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p30 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p31 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p32 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p33 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p34 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p35 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p36 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p37 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p38 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p39 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p40 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p41 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p42 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p43 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p44 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p45 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p46 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p47 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p48 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p49 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p50 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p51 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p52 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p53 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p54 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p55 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p56 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p57 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p58 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p59 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p60 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p61 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p62 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p63 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p64 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p65 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p66 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p67 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p68 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p69 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p70 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p71 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p72 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p73 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p74 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p75 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p76 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p77 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p78 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p79 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p80 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p81 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p82 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p83 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p84 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p85 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p86 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p87 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p88 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p89 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p90 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p91 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p92 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p93 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p94 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p95 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p96 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p97 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p98 (id, handler_id, handler_version) {
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
    }
}

diesel::table! {
    processed_transactions_temp_p99 (id, handler_id, handler_version) {
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
        user_id -> Nullable<Varchar>,
        timestamp -> Timestamptz,
        project_id -> Nullable<Int4>,
    }
}

diesel::allow_tables_to_appear_in_same_query!(
    invocation,
    processed_transactions,
    processed_transactions_old,
    processed_transactions_old_2,
    processed_transactions_old_3,
    processed_transactions_temp_2_p00,
    processed_transactions_temp_2_p01,
    processed_transactions_temp_2_p02,
    processed_transactions_temp_2_p03,
    processed_transactions_temp_2_p04,
    processed_transactions_temp_2_p05,
    processed_transactions_temp_2_p06,
    processed_transactions_temp_2_p07,
    processed_transactions_temp_2_p08,
    processed_transactions_temp_2_p09,
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
    processed_transactions_temp_p00,
    processed_transactions_temp_p01,
    processed_transactions_temp_p02,
    processed_transactions_temp_p03,
    processed_transactions_temp_p04,
    processed_transactions_temp_p05,
    processed_transactions_temp_p06,
    processed_transactions_temp_p07,
    processed_transactions_temp_p08,
    processed_transactions_temp_p09,
    processed_transactions_temp_p10,
    processed_transactions_temp_p11,
    processed_transactions_temp_p12,
    processed_transactions_temp_p13,
    processed_transactions_temp_p14,
    processed_transactions_temp_p15,
    processed_transactions_temp_p16,
    processed_transactions_temp_p17,
    processed_transactions_temp_p18,
    processed_transactions_temp_p19,
    processed_transactions_temp_p20,
    processed_transactions_temp_p21,
    processed_transactions_temp_p22,
    processed_transactions_temp_p23,
    processed_transactions_temp_p24,
    processed_transactions_temp_p25,
    processed_transactions_temp_p26,
    processed_transactions_temp_p27,
    processed_transactions_temp_p28,
    processed_transactions_temp_p29,
    processed_transactions_temp_p30,
    processed_transactions_temp_p31,
    processed_transactions_temp_p32,
    processed_transactions_temp_p33,
    processed_transactions_temp_p34,
    processed_transactions_temp_p35,
    processed_transactions_temp_p36,
    processed_transactions_temp_p37,
    processed_transactions_temp_p38,
    processed_transactions_temp_p39,
    processed_transactions_temp_p40,
    processed_transactions_temp_p41,
    processed_transactions_temp_p42,
    processed_transactions_temp_p43,
    processed_transactions_temp_p44,
    processed_transactions_temp_p45,
    processed_transactions_temp_p46,
    processed_transactions_temp_p47,
    processed_transactions_temp_p48,
    processed_transactions_temp_p49,
    processed_transactions_temp_p50,
    processed_transactions_temp_p51,
    processed_transactions_temp_p52,
    processed_transactions_temp_p53,
    processed_transactions_temp_p54,
    processed_transactions_temp_p55,
    processed_transactions_temp_p56,
    processed_transactions_temp_p57,
    processed_transactions_temp_p58,
    processed_transactions_temp_p59,
    processed_transactions_temp_p60,
    processed_transactions_temp_p61,
    processed_transactions_temp_p62,
    processed_transactions_temp_p63,
    processed_transactions_temp_p64,
    processed_transactions_temp_p65,
    processed_transactions_temp_p66,
    processed_transactions_temp_p67,
    processed_transactions_temp_p68,
    processed_transactions_temp_p69,
    processed_transactions_temp_p70,
    processed_transactions_temp_p71,
    processed_transactions_temp_p72,
    processed_transactions_temp_p73,
    processed_transactions_temp_p74,
    processed_transactions_temp_p75,
    processed_transactions_temp_p76,
    processed_transactions_temp_p77,
    processed_transactions_temp_p78,
    processed_transactions_temp_p79,
    processed_transactions_temp_p80,
    processed_transactions_temp_p81,
    processed_transactions_temp_p82,
    processed_transactions_temp_p83,
    processed_transactions_temp_p84,
    processed_transactions_temp_p85,
    processed_transactions_temp_p86,
    processed_transactions_temp_p87,
    processed_transactions_temp_p88,
    processed_transactions_temp_p89,
    processed_transactions_temp_p90,
    processed_transactions_temp_p91,
    processed_transactions_temp_p92,
    processed_transactions_temp_p93,
    processed_transactions_temp_p94,
    processed_transactions_temp_p95,
    processed_transactions_temp_p96,
    processed_transactions_temp_p97,
    processed_transactions_temp_p98,
    processed_transactions_temp_p99,
    reported_metrics,
);
