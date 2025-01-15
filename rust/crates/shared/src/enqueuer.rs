use std::env;

use crate::connection::DbPool;
use crate::models;
use crate::schema::eth_transaction;
use crate::syncing::State;
use crate::types::transactions::IngestTransaction;
use crate::{connection::establish_connection_pool, s3::S3};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use diesel_async::scoped_futures::ScopedFutureExt;
use diesel_async::{AsyncConnection, RunQueryDsl};
use futures::future::join_all;
use futures::TryFutureExt;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Payload {
    Batch { download_url: String },
    Raw { data: Vec<IngestTransaction> },
}

impl Payload {
    pub async fn get_transactions(&self) -> Result<Vec<IngestTransaction>, reqwest::Error> {
        match self {
            Payload::Batch { download_url } => {
                reqwest::get(download_url.clone())
                    .await
                    .unwrap()
                    .json::<Vec<IngestTransaction>>()
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
        txs: &Vec<IngestTransaction>,
    ) -> Result<(), errors::TransactionEnqueuerError>;
}

pub struct SQSTransactionEnqueuer<T: S3> {
    sqs_client: aws_sdk_sqs::Client,
    queue_url: String,
    s3_client: T,
    pool: DbPool,
}

impl SQSTransactionEnqueuer<aws_sdk_s3::Client> {
    pub async fn with_defaults(queue_url: String) -> Self {
        let config = aws_config::load_from_env().await;
        let s3_client = aws_sdk_s3::Client::new(&config);
        let sqs_client = aws_sdk_sqs::Client::new(&config);
        let pool = establish_connection_pool().await;

        Self {
            s3_client,
            queue_url,
            sqs_client,
            pool,
        }
    }
}

impl<T: S3> SQSTransactionEnqueuer<T> {
    pub fn new(
        s3_client: T,
        queue_url: String,
        sqs_client: aws_sdk_sqs::Client,
        pool: DbPool,
    ) -> Self {
        Self {
            s3_client,
            queue_url,
            sqs_client,
            pool,
        }
    }

    async fn upload_raw(
        &self,
        pipeline: &mut State,
        txs: &Vec<IngestTransaction>,
    ) -> Result<(), errors::TransactionEnqueuerError> {
        let mut i = 0;
        while i < txs.len() {
            let mut group = Vec::new();
            let mut group_byte_size = 0;

            // Group each entry into max 256kb entries.
            while i < txs.len() {
                let current_tx = &txs[i];

                // check that tx size will not make this entry over 256kb
                let tx_size = serde_json::to_string(current_tx).unwrap().len();
                if tx_size + group_byte_size > 20000 {
                    break;
                }

                // add tx size to group size and add tx to group
                group_byte_size += tx_size;
                group.push(current_tx.clone());

                // next result
                i += 1;
            }

            self.upload_sqs(group.clone()).await?;

            pipeline.increment_transaction_count(group.len()).await?;
        }

        Ok(())
    }

    async fn upload_sqs(
        &self,
        group: Vec<IngestTransaction>,
    ) -> Result<(), errors::TransactionEnqueuerError> {
        Ok(self
            .sqs_client
            .send_message()
            .queue_url(self.queue_url.to_owned())
            .message_body(serde_json::to_string(&Payload::Raw { data: group }).unwrap())
            .message_group_id("main")
            .message_deduplication_id(Uuid::new_v4())
            .send()
            .map_ok(|_| ())
            .await?)
    }

    async fn upload_s3(
        &self,
        pipeline: &mut State,
        txs: &Vec<IngestTransaction>,
    ) -> Result<(), errors::TransactionEnqueuerError> {
        let mut i = 0;
        while i < txs.len() {
            let mut batch = Vec::new();

            // Max transactions per batch: 60
            while i < txs.len() && batch.len() < 60 {
                let s3_result = &txs[i];
                batch.push(s3_result);
                i += 1;
            }

            let id = uuid::Uuid::new_v4();

            let bucket = "ingest-fetch-logs";
            let key = format!(
                "syncs/{function_id}/{id}",
                function_id = env::var("FUNCTION_ID").expect("FUNCTION ID not defined"),
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
                    serde_json::to_string(&Payload::Batch {
                        download_url: download_url.clone(),
                    })
                    .unwrap(),
                )
                .message_group_id("main")
                .message_deduplication_id(key)
                .send()
                .await?;

            pipeline.increment_transaction_count(batch.len()).await?;
        }

        Ok(())
    }
}

#[async_trait]
impl<T: S3> TransactionEnqueuer for SQSTransactionEnqueuer<T> {
    #[tracing::instrument(skip_all, err)]
    async fn enqueue_transactions(
        &self,
        state: &mut State,
        txs: &Vec<IngestTransaction>,
    ) -> Result<(), errors::TransactionEnqueuerError> {
        let conn = &mut self.pool.get().await?;

        conn.transaction(|conn| {
            async move {
                let chunked_txs = txs.iter().chunks(200);
                let futures = chunked_txs.into_iter().map(|txs| {
                    diesel::insert_into(eth_transaction::table)
                        .values(
                            txs.map(|tx| models::EthTransaction {
                                transaction_hash: tx.transaction_hash.clone(),
                                function_id: state.function_id(),
                                deployment_id: state.deployment_id(),
                                created_at: Utc::now(),
                                block_timestamp: DateTime::from_timestamp_millis(
                                    tx.block_timestamp * 1000,
                                )
                                .unwrap(),
                            })
                            .collect::<Vec<_>>(),
                        )
                        .execute(conn)
                });

                join_all(futures)
                    .await
                    .into_iter()
                    .collect::<Result<Vec<_>, _>>()
            }
            .scope_boxed()
        })
        .await?;

        let serialised_txs = serde_json::to_string(&txs).unwrap();
        if serialised_txs.len() < 200000 {
            return self.upload_raw(state, txs).await;
        }

        return self.upload_s3(state, txs).await;
    }
}

pub mod errors {
    use aws_sdk_sqs::{error::SdkError, operation::send_message::SendMessageError};
    use diesel_async::pooled_connection::deadpool::PoolError;
    use thiserror::Error;

    use crate::s3::errors::PutS3ObjectError;

    #[derive(Error, Debug)]
    pub enum TransactionEnqueuerError {
        #[error("Failed to upload transactions: {0}")]
        Web3ClientError(#[from] crate::web3_client::errors::Web3ClientError),
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
