use crate::{
    manifest::Manifest, types::pipeline::Pipeline, types::transactions::IngestTransaction,
};

use self::enqueuer::{TransactionEnqueuer, TransactionEnqueuerImpl};
use self::fetcher::{TransactionFetcher, TransactionFetcherImpl, Web3ClientImpl};

mod enqueuer;
mod fetcher;

pub struct Api<F: TransactionFetcher, E: TransactionEnqueuer> {
    log_fetcher: F,
    tx_enqueuer: E,
}

impl<F: TransactionFetcher, E: TransactionEnqueuer> Api<F, E> {
    pub fn fetch_transactions(&self) -> TransactionFetcherFluentBuilder<'_, '_, F> {
        TransactionFetcherFluentBuilder {
            log_fetcher: &self.log_fetcher,
            manifest: None,
            start_block: None,
            end_block: None,
        }
    }

    pub fn enqueue_transactions(&self) -> TransactionEnqueuerFluentBuilder<'_, '_, '_, E> {
        TransactionEnqueuerFluentBuilder {
            tx_enqueuer: &self.tx_enqueuer,
            pipeline: None,
            transactions: None,
            queue_url: None,
        }
    }
}

impl Api<TransactionFetcherImpl<Web3ClientImpl>, TransactionEnqueuerImpl> {
    pub fn new() -> Self {
        Self {
            log_fetcher: TransactionFetcherImpl::new(),
            tx_enqueuer: TransactionEnqueuerImpl::new(),
        }
    }
}

pub struct TransactionFetcherFluentBuilder<'a, 'b, T: TransactionFetcher> {
    log_fetcher: &'b T,
    manifest: Option<&'a Manifest>,
    start_block: Option<u64>,
    end_block: Option<u64>,
}

impl<'a, 'b, T: TransactionFetcher> TransactionFetcherFluentBuilder<'a, 'b, T> {
    pub fn set_manifest(&mut self, value: &'a Manifest) -> &mut Self {
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

pub struct TransactionEnqueuerFluentBuilder<'b, 'c, 't, T: TransactionEnqueuer> {
    tx_enqueuer: &'b T,

    pipeline: Option<&'c mut Pipeline>,
    transactions: Option<&'t Vec<IngestTransaction>>,
    queue_url: Option<String>,
}

impl<'b, 'c, 't, T: TransactionEnqueuer> TransactionEnqueuerFluentBuilder<'b, 'c, 't, T> {
    pub fn set_pipeline(&mut self, value: &'c mut Pipeline) -> &mut Self {
        self.pipeline = Some(value);
        self
    }

    pub fn set_transactions(&mut self, value: &'t Vec<IngestTransaction>) -> &mut Self {
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

        let queue_url = self
            .queue_url
            .as_ref()
            .expect("Queue url must be set")
            .clone();

        let transactions = self
            .tx_enqueuer
            .enqueue_transactions(pipeline, queue_url, txs)
            .await
            .unwrap();

        Ok(transactions)
    }
}
