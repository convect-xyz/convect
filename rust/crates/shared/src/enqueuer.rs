use std::env;

use crate::connection::DbPool;
use crate::manifest::Manifest;
use crate::models;
use crate::schema::{batch, eth_transaction};
use crate::syncing::State;
use crate::types::batch::{IngestBatch, IngestBatchTransaction};
use crate::{connection::establish_connection_pool, s3::S3};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use diesel_async::RunQueryDsl;
use futures::future::join_all;
use futures::TryFutureExt;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub enum UploadMethod {
    S3,
    Raw,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Payload {
    S3 {
        #[serde(rename = "downloadUrl")]
        download_url: String,
    },
    Raw {
        data: IngestBatch,
    },
}

impl Payload {
    pub async fn get_data(&self) -> Result<IngestBatch, reqwest::Error> {
        match self {
            Payload::S3 { download_url } => {
                reqwest::get(download_url.clone())
                    .await
                    .unwrap()
                    .json::<IngestBatch>()
                    .await
            }
            Payload::Raw { data } => Ok(data.clone()),
        }
    }
}

#[async_trait]
pub trait TransactionEnqueuer {
    async fn enqueue_transactions(
        &self,
        pipeline: &mut State,
        txs: Vec<IngestBatchTransaction>,
        upload_method: UploadMethod,
    ) -> Result<(), errors::TransactionEnqueuerError>;
}

pub struct SQSTransactionEnqueuer<T: S3> {
    sqs_client: aws_sdk_sqs::Client,
    queue_url: String,
    s3_client: T,
    pool: DbPool,
    chain_id: u64,
    manifest: Manifest,
}

impl SQSTransactionEnqueuer<aws_sdk_s3::Client> {
    pub async fn with_defaults(queue_url: String, chain_id: u64, manifest: Manifest) -> Self {
        let config = aws_config::load_from_env().await;
        let s3_client = aws_sdk_s3::Client::new(&config);
        let sqs_client = aws_sdk_sqs::Client::new(&config);
        let pool = establish_connection_pool().await;

        Self {
            s3_client,
            queue_url,
            sqs_client,
            pool,
            manifest,
            chain_id,
        }
    }
}

impl<T: S3> SQSTransactionEnqueuer<T> {
    pub fn new(
        s3_client: T,
        queue_url: String,
        sqs_client: aws_sdk_sqs::Client,
        pool: DbPool,
        chain_id: u64,
        manifest: Manifest,
    ) -> Self {
        Self {
            s3_client,
            queue_url,
            sqs_client,
            pool,
            manifest,
            chain_id,
        }
    }

    async fn send_batch_to_queue(
        &self,
        batch: IngestBatch,
    ) -> Result<(), errors::TransactionEnqueuerError> {
        Ok(self
            .sqs_client
            .send_message()
            .queue_url(self.queue_url.to_owned())
            .message_body(serde_json::to_string(&Payload::Raw { data: batch }).unwrap())
            .message_group_id("main")
            .message_deduplication_id(Uuid::new_v4())
            .send()
            .map_ok(|_| ())
            .await?)
    }

    async fn send_batch_to_s3(
        &self,
        batch: IngestBatch,
    ) -> Result<(), errors::TransactionEnqueuerError> {
        let batch_id = batch.batch_id.clone();
        let bucket = "ingest-fetch-logs";
        let key = format!(
            "syncs/{function_id}/{batch_id}",
            function_id = env::var("FUNCTION_ID").expect("FUNCTION ID not defined"),
            batch_id = batch_id
        );

        self.s3_client
            .put_s3_object(
                "ingest-fetch-logs",
                key.as_str(),
                serde_json::to_string(&batch).unwrap(),
            )
            .await?;

        let download_url = format!(
            "https://{bucket}.s3.{region}.amazonaws.com/{key}",
            bucket = bucket,
            region = "eu-west-1",
            key = key
        );

        self.sqs_client
            .send_message()
            .queue_url(self.queue_url.to_owned())
            .message_body(
                serde_json::to_string(&Payload::S3 {
                    download_url: download_url.clone(),
                })
                .unwrap(),
            )
            .message_group_id("main")
            .message_deduplication_id(key)
            .send()
            .await?;

        Ok(())
    }

    async fn create_batch(
        &self,
        batch_id: String,
        state: &mut State,
        txs: &Vec<IngestBatchTransaction>,
    ) -> Result<(), errors::TransactionEnqueuerError> {
        let conn = &mut self.pool.get().await?;

        let function_id = state.function_id();
        let deployment_id = state.deployment_id();
        let chain_id = state.chain_id();

        diesel::insert_into(batch::table)
            .values(models::Batch {
                batch_id: batch_id.clone(),
                function_id: function_id.clone(),
                deployment_id: deployment_id.clone(),
                chain_id: chain_id.clone() as i32,
                timestamp_ms: Utc::now(),
            })
            .execute(conn)
            .await?;

        let chunked_txs = txs.iter().chunks(200);
        let futures = chunked_txs.into_iter().map(|txs| {
            diesel::insert_into(eth_transaction::table)
                .values(
                    txs.map(|tx| models::EthTransaction {
                        project_id: state.project_id(),
                        batch_id: batch_id.clone(),
                        transaction_hash: tx.transaction.transaction_hash.clone(),
                        function_id: function_id.clone(),
                        deployment_id: deployment_id.clone(),
                        created_at: Utc::now(),
                        chain_id: chain_id.clone() as i32,
                        block_timestamp: DateTime::from_timestamp_millis(0).unwrap(),
                        tx_configs: tx.tx_configs.clone(),
                    })
                    .collect::<Vec<_>>(),
                )
                .execute(conn)
        });

        join_all(futures)
            .await
            .into_iter()
            .collect::<Result<Vec<_>, _>>();

        Ok(())
    }
}

#[async_trait]
impl<T: S3> TransactionEnqueuer for SQSTransactionEnqueuer<T> {
    #[tracing::instrument(skip_all, err)]
    async fn enqueue_transactions(
        &self,
        state: &mut State,
        txs: Vec<IngestBatchTransaction>,
        upload_method: UploadMethod,
    ) -> Result<(), errors::TransactionEnqueuerError> {
        let batch_id = Uuid::new_v4().to_string();
        let batch = IngestBatch {
            batch_id: batch_id.clone(),
            chain_id: state.chain_id(),
            transactions: txs,
        };

        self.create_batch(batch_id.clone(), state, &batch.transactions)
            .await?;

        match upload_method {
            UploadMethod::S3 => {
                self.send_batch_to_s3(batch).await?;
            }
            UploadMethod::Raw => {
                self.send_batch_to_queue(batch).await?;
            }
        }

        Ok(())
    }
}

pub mod errors {
    use aws_sdk_sqs::{error::SdkError, operation::send_message::SendMessageError};
    use diesel_async::pooled_connection::deadpool::PoolError;
    use thiserror::Error;

    use crate::s3::errors::PutS3ObjectError;

    #[derive(Error, Debug)]
    pub enum TransactionEnqueuerError {
        #[error("Failed to fetch transactions: {0}")]
        Web3ClientError(#[from] crate::fetcher::web3::client::errors::Web3ClientError),
        #[error("Failed to upload transactions: {0}")]
        SQSError(#[from] SdkError<SendMessageError>),
        #[error("Redis error: {0}")]
        RedisError(#[from] crate::redis_client::errors::RedisClientError),
        #[error("S3 error: {0}")]
        S3Error(#[from] PutS3ObjectError),
        #[error("Pool error: {0}")]
        PoolError(#[from] PoolError),
        #[error("Diesel error: {0}")]
        DieselError(#[from] diesel::result::Error),
    }
}
