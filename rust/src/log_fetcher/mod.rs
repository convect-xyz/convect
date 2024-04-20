pub mod invocation {
    use serde::{Deserialize, Serialize};

    #[derive(Deserialize, Serialize, Debug)]
    pub struct InvocationRequest {
        pub id: u64,
        pub start_block: u64,
        pub end_block: u64,
    }

    #[derive(Deserialize, Serialize, Debug)]
    pub struct InvocationResponse {
        pub s3_bucket: Option<String>,
        pub s3_prefix: Option<String>,
    }
}
