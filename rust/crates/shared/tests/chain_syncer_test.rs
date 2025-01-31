use std::{fs::File, path::Path, sync::Arc};

use expectations::{Expectations, ExpectedTransaction};
use futures::{future::join_all, FutureExt};
use shared::{
    configuration::SharedConfig,
    enqueuer::{Payload, SQSTransactionEnqueuer},
    fetcher::TransactionFetcherImpl,
    manifest::{Manifest, ManifestChainConfig},
    redis_client::RedisClientImpl,
    syncer::ChainSyncer,
    syncing::State,
    types::transactions::IngestTransaction,
};

mod common;
mod expectations;

struct Test {
    name: &'static str,
    path: &'static str,
    shared_config: SharedConfig,
    manifest: Manifest,
    sqs_client: aws_sdk_sqs::Client,
}

impl Test {
    pub async fn new(name: &'static str, path: &'static str) -> Self {
        let shared_config = SharedConfig::new().unwrap();
        let manifest = Manifest::from_file(&Self::manifest_path(path))
            .await
            .unwrap();
        let aws_config = aws_config::load_from_env().await;
        let sqs_client = aws_sdk_sqs::Client::new(&aws_config);

        Self {
            name,
            path,
            shared_config,
            manifest,
            sqs_client,
        }
    }

    fn manifest_path(path: &str) -> String {
        Path::new(path)
            .join("manifest.json")
            .to_str()
            .unwrap()
            .to_string()
    }
}

impl Test {
    pub fn queue_name(&self, chain_id: u64) -> String {
        format!("integration-{}-{}.fifo", self.name, chain_id)
    }

    pub fn pipeline_function_id(&self) -> String {
        format!("integration-{}", self.name)
    }

    fn expectations_path(&self, chain_id: u64) -> String {
        Path::new(&self.path)
            .join(format!("expectations-{chain_id}.yaml"))
            .to_str()
            .unwrap()
            .to_string()
    }

    fn load_expectations(&self, chain_id: u64) -> Expectations {
        let file = File::open(&self.expectations_path(chain_id)).unwrap();
        serde_yaml::from_reader(file).expect("failed to read file")
    }

    async fn run(&self) -> Result<(), Box<dyn std::error::Error>> {
        for chain_config in &self.manifest.chains {
            self.run_for_chain(chain_config).await?;
        }

        Ok(())
    }

    async fn run_for_chain(
        &self,
        chain_config: &ManifestChainConfig,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let chain_id = chain_config.chain_id;
        let queue =
            common::utils::setup_queue(&self.queue_name(chain_id), &self.sqs_client).await?;
        let enqueuer =
            SQSTransactionEnqueuer::with_defaults(queue.queue_url.clone().unwrap()).await;
        let fetcher = TransactionFetcherImpl::with_defaults(chain_id);
        let syncer = ChainSyncer::new(&self.manifest, &enqueuer, &fetcher);
        let mut pipeline = State::load(
            "integration-test".to_string(),
            self.pipeline_function_id(),
            chain_id,
            uuid::Uuid::new_v4().to_string(),
            Arc::new(RedisClientImpl::new(&self.shared_config.redis.url).await),
        )
        .await?;
        let expectations = self.load_expectations(chain_id);

        syncer
            .sync(
                &mut pipeline,
                expectations.start_block,
                expectations.end_block,
            )
            .await?;

        let payloads: Vec<Payload> =
            common::utils::poll_queue(&queue.queue_url.clone().unwrap(), &self.sqs_client).await?;

        let actual_transactions = join_all(
            payloads
                .iter()
                .map(|p| p.get_transactions().map(|v| v.unwrap())),
        )
        .map(|transactions| transactions.into_iter().flatten().collect::<Vec<_>>())
        .await;

        let expected_transactions = &expectations.transactions;
        assert_eq!(
            expected_transactions.len(),
            actual_transactions.len(),
            "Transaction count mismatch. Expected: {:?}, Actual: {:?}",
            expected_transactions.len(),
            actual_transactions.len()
        );

        for (expected, actual) in expected_transactions.iter().zip(actual_transactions.iter()) {
            self.assert_expectations(expected, actual);
        }

        Ok(())
    }

    fn assert_expectations(&self, expected: &ExpectedTransaction, actual: &IngestTransaction) {
        assert_eq!(
            expected.block_number, actual.block_number,
            "Block number mismatch. Expected: {:?}, Actual: {:?}",
            expected.block_number, actual.block_number
        );
        assert_eq!(
            expected.block_hash.to_lowercase(),
            actual.block_hash.to_lowercase(),
            "Block hash mismatch. Expected: {:?}, Actual: {:?}",
            expected.block_hash,
            actual.block_hash
        );
        assert_eq!(
            expected.transaction_hash.to_lowercase(),
            actual.transaction_hash.to_lowercase(),
            "Transaction hash mismatch. Expected: {:?}, Actual: {:?}",
            expected.transaction_hash,
            actual.transaction_hash
        );
        assert_eq!(
            expected.transaction_index, actual.transaction_index,
            "Transaction index mismatch. Expected: {:?}, Actual: {:?}",
            expected.transaction_index, actual.transaction_index
        );
        assert_eq!(
            expected.logs.len(),
            actual.logs.len(),
            "Log count mismatch. Expected: {:?}, Actual: {:?}",
            expected.logs.len(),
            actual.logs.len()
        );

        for (expected_log, actual_log) in expected.logs.iter().zip(actual.logs.iter()) {
            assert_eq!(
                expected_log.address, actual_log.address,
                "Address mismatch. Expected: {:?}, Actual: {:?}",
                expected_log.address, actual_log.address
            );
            assert_eq!(
                expected_log.topics.len(),
                actual_log.topics.len(),
                "Topic count mismatch. Expected: {:?}, Actual: {:?}",
                expected_log.topics.len(),
                actual_log.topics.len()
            );

            for (expected_topic, actual_topic) in
                expected_log.topics.iter().zip(actual_log.topics.iter())
            {
                assert_eq!(
                    expected_topic.to_lowercase(),
                    actual_topic.to_lowercase(),
                    "Topic mismatch. Expected: {:?}, Actual: {:?}",
                    expected_topic,
                    actual_topic
                );
            }
        }
    }
}

#[tokio::test]
async fn test_same_block() -> Result<(), Box<dyn std::error::Error>> {
    Test::new("same-block", "tests/expectations/same_block")
        .await
        .run()
        .await
}

#[tokio::test]
async fn test_no_transactions() -> Result<(), Box<dyn std::error::Error>> {
    Test::new("no-transactions", "tests/expectations/no_transactions")
        .await
        .run()
        .await
}

#[tokio::test]
async fn test_historical_transactions() -> Result<(), Box<dyn std::error::Error>> {
    Test::new(
        "historical-transactions",
        "tests/expectations/historical_transactions",
    )
    .await
    .run()
    .await
}
