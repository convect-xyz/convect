use graphql_client::GraphQLQuery;
use reqwest;
use std::future::Future;

type Long = u64;
type Bytes32 = String;
type Address = String;
type Bytes = String;
type BigInt = String;

// The paths are relative to the directory where your `Cargo.toml` is located.
// Both json and the GraphQL schema language are supported as sources for the schema
#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "schemas/schema.graphql",
    query_path = "schemas/queries/get_logs.graphql",
    response_derives = "Debug"
)]
pub struct ExampleQuery;

pub trait GethGraphqlClient: Sync + Send {
    fn get_logs(
        &self,
        variables: example_query::Variables,
    ) -> impl Future<Output = Result<example_query::ResponseData, errors::GethGraphqlClientError>> + Send;
}

pub struct GethGraphqlClientImpl {
    base_url: String,
}

impl GethGraphqlClientImpl {
    pub fn new(base_url: String) -> Self {
        Self { base_url }
    }
}

impl GethGraphqlClient for GethGraphqlClientImpl {
    async fn get_logs(
        &self,
        variables: example_query::Variables,
    ) -> Result<example_query::ResponseData, errors::GethGraphqlClientError> {
        let request_body = ExampleQuery::build_query(variables);

        let client = reqwest::Client::new();

        println!("{}", request_body);
        println!("{}", self.base_url);
        let res = client
            .post(format!("{}/graphql", self.base_url))
            .json(&request_body)
            .send()
            .await?;
        Ok(res.json().await?)
    }
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum GethGraphqlClientError {
        #[error("Box error: {0}")]
        BoxError(#[from] Box<dyn std::error::Error>),
        #[error("Reqwest error: {0}")]
        ReqwestError(#[from] reqwest::Error),
    }
}
