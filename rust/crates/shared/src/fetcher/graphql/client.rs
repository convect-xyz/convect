use async_trait::async_trait;
use futures::FutureExt;
use graphql_client::{GraphQLQuery, Response};
use reqwest::{self};

type Long = String;
type Bytes32 = String;
type Address = String;
type Bytes = String;
type BigInt = String;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "schemas/schema.graphql",
    query_path = "schemas/queries/get_logs.graphql",
    response_derives = "Debug"
)]
pub struct ExampleQuery;

#[async_trait]
pub trait GethGraphqlClient: Sync + Send {
    async fn get_logs(
        &self,
        variables: example_query::Variables,
    ) -> Result<example_query::ResponseData, errors::GethGraphqlClientError>;
}

pub struct GethGraphqlClientImpl {
    base_url: String,
    client: reqwest::Client,
}

impl GethGraphqlClientImpl {
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl GethGraphqlClient for GethGraphqlClientImpl {
    async fn get_logs(
        &self,
        variables: example_query::Variables,
    ) -> Result<example_query::ResponseData, errors::GethGraphqlClientError> {
        let request_body = ExampleQuery::build_query(variables);

        let response = self
            .client
            .post(format!("{}/graphql", self.base_url))
            .json(&request_body)
            .send()
            .await?;

        Ok(response
            .json::<Response<example_query::ResponseData>>()
            .map(|f| f?.data.ok_or(errors::GethGraphqlClientError::MissingData))
            .await?)
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
        #[error("Missing data")]
        MissingData,
    }
}
