use crate::{
    types::manifest::Manifest, types::pipeline::Pipeline, types::transactions::IngestTransaction,
};

use self::enqueuer::{TransactionEnqueuer, TransactionEnqueuerImpl};
use self::fetcher::{TransactionFetcher, TransactionFetcherImpl, Web3ClientImpl};

pub mod enqueuer;
pub mod fetcher;

pub struct Api<F: TransactionFetcher, E: TransactionEnqueuer> {
    log_fetcher: F,
    tx_enqueuer: E,
}

impl<F: TransactionFetcher, E: TransactionEnqueuer> Api<F, E> {
    pub fn fetch_transactions(&self) -> TransactionFetcherFluentBuilder<'_, F> {
        TransactionFetcherFluentBuilder {
            log_fetcher: &self.log_fetcher,
            manifest: None,
            start_block: None,
            end_block: None,
        }
    }

    pub fn enqueue_transactions(&self) -> TransactionEnqueuerFluentBuilder<'_, E> {
        TransactionEnqueuerFluentBuilder {
            tx_enqueuer: &self.tx_enqueuer,
            pipeline: None,
            transactions: None,
            queue_url: None,
        }
    }
}

impl Api<TransactionFetcherImpl<Web3ClientImpl>, TransactionEnqueuerImpl<aws_sdk_s3::Client>> {
    pub fn new(config: &aws_config::SdkConfig) -> Self {
        Self {
            log_fetcher: TransactionFetcherImpl::new(),
            tx_enqueuer: TransactionEnqueuerImpl::new(
                aws_sdk_s3::Client::new(config),
                aws_sdk_sqs::Client::new(&config),
            ),
        }
    }
}

pub struct TransactionFetcherFluentBuilder<'a, T: TransactionFetcher> {
    log_fetcher: &'a T,
    manifest: Option<&'a Manifest>,
    start_block: Option<u64>,
    end_block: Option<u64>,
}

impl<'a, T: TransactionFetcher> TransactionFetcherFluentBuilder<'a, T> {
    pub fn set_manifest(&'a mut self, value: &'a Manifest) -> &'a mut Self {
        self.manifest = Some(value);
        self
    }

    pub fn set_start_block(&mut self, value: u64) -> &mut Self {
        self.start_block = Some(value);
        self
    }

    pub fn set_end_block(&mut self, value: u64) -> &mut Self {
        self.end_block = Some(value);
        self
    }

    pub async fn send(&self) -> Result<Vec<IngestTransaction>, web3::Error> {
        let manifest = self.manifest.expect("Manifest must be set");
        let start_block = self.start_block.expect("Start Block must be set");
        let end_block = self.end_block.expect("End Block must be set");

        let transactions = self
            .log_fetcher
            .get_ingest_transactions(manifest, start_block, end_block)
            .await
            .unwrap();

        Ok(transactions)
    }
}

pub struct TransactionEnqueuerFluentBuilder<'a, T: TransactionEnqueuer> {
    tx_enqueuer: &'a T,
    pipeline: Option<&'a mut Pipeline>,
    transactions: Option<&'a Vec<IngestTransaction>>,
    queue_url: Option<String>,
}

impl<'a, T: TransactionEnqueuer> TransactionEnqueuerFluentBuilder<'a, T> {
    pub fn set_pipeline(&'a mut self, value: &'a mut Pipeline) -> &'a mut Self {
        self.pipeline = Some(value);
        self
    }

    pub fn set_transactions(&'a mut self, value: &'a Vec<IngestTransaction>) -> &'a mut Self {
        self.transactions = Some(value);
        self
    }

    pub fn set_queue_url(&mut self, value: String) -> &mut Self {
        self.queue_url = Some(value);
        self
    }

    pub async fn send(&mut self) -> Result<(), web3::Error> {
        let pipeline = self.pipeline.as_mut().expect("Pipeline must be set");

        let txs = self.transactions.expect("Transactions must be set");

        if txs.is_empty() {
            return Ok(());
        }

        let queue_url = self
            .queue_url
            .as_ref()
            .expect("Queue url must be set")
            .clone();

        self.tx_enqueuer
            .enqueue_transactions(pipeline, queue_url, txs)
            .await
            .unwrap();

        Ok(())
    }
}
