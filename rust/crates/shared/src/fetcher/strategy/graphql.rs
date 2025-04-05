use super::{FetchStrategy, LogResult};
use crate::fetcher::graphql::client::example_query::FilterCriteria;
use crate::fetcher::graphql::client::{example_query, GethGraphqlClient, GethGraphqlClientImpl};
use crate::manifest::{LogConfig, Manifest, TransactionConfig};
use crate::networks::get_first_polling_url;
use async_trait::async_trait;
use std::cmp::max;
use std::str::FromStr;
use tokio_retry::strategy::{jitter, ExponentialBackoff};
use tokio_retry::Retry;
use web3::types::{H160, H256};

pub struct GraphqlFetchStrategyImpl<T: GethGraphqlClient> {
    graphql_client: T,
    chain_id: u64,
}

impl<T: GethGraphqlClient> GraphqlFetchStrategyImpl<T> {
    pub fn new(graphql_client: T, chain_id: u64) -> Self {
        Self {
            graphql_client,
            chain_id,
        }
    }
}

impl GraphqlFetchStrategyImpl<GethGraphqlClientImpl> {
    pub async fn with_defaults(chain_id: u64) -> Self {
        Self {
            graphql_client: GethGraphqlClientImpl::new(get_first_polling_url(chain_id).await),
            chain_id,
        }
    }
}

#[async_trait]
impl<T: GethGraphqlClient> FetchStrategy for GraphqlFetchStrategyImpl<T> {
    #[tracing::instrument(skip_all, err)]
    async fn get_log_results_in_range(
        &self,
        manifest: &Manifest,
        range_start: u64,
        range_end: u64,
    ) -> Result<Vec<LogResult>, super::errors::FetchStrategyError> {
        let chain_id = self.chain_id;

        let eligible_tx_cfgs: Vec<_> =
            manifest.get_eligible_tx_configs(chain_id, range_start, range_end);

        let fetched_logs = Retry::spawn(
            ExponentialBackoff::from_millis(15).map(jitter).take(3),
            || async {
                println!("[{:?}] Fetching logs", self.chain_id);

                let filter =
                    get_web3_client_filter(&eligible_tx_cfgs, chain_id, range_start, range_end);

                Ok::<_, super::errors::FetchStrategyError>(
                    self.graphql_client.get_logs(filter).await?,
                )
            },
        )
        .await?;

        Ok(fetched_logs
            .logs
            .into_iter()
            .map(|log| LogResult::Graphql(log))
            .collect())
    }
}

/**
  Returns a Filter that covers all the logs that are relevant to the given range.
  The Filter is constructed by:

  * taking all log config addresses and topics that are relevant to the current range.
  * taking the smallest start block of all the tx_configs as the start block that are relevant to the current range.

  After a response is returned from the web3 client, any extraneous logs that are not relevant to the Manifest should be removed with
  the remove_extranous_logs function.
*/
pub fn get_web3_client_filter(
    tx_configs: &Vec<(TransactionConfig, Vec<LogConfig>)>,
    chain_id: u64,
    range_start: u64,
    range_end: u64,
) -> example_query::Variables {
    let all_log_configs: Vec<&LogConfig> = tx_configs
        .iter()
        .map(|(_, log_configs)| log_configs)
        .flatten()
        .collect();

    let mut addresses: Vec<H160> = all_log_configs
        .iter()
        .map(|c| H160::from_str(c.address.get_address(chain_id).unwrap().as_str()).unwrap())
        .collect();
    addresses.sort();
    addresses.dedup();

    let mut topics: Vec<H256> = all_log_configs
        .iter()
        .map(|c| H256::from_str(c.topics[0].as_str()).unwrap())
        .collect();
    topics.sort();
    topics.dedup();

    let smallest_tx_cfg_start_block = tx_configs
        .iter()
        .map(|tx_cfg| tx_cfg.0.get_start_block(chain_id).unwrap_or(0))
        .min()
        .unwrap_or(0);

    let start_block = max(
        u64::try_from(smallest_tx_cfg_start_block).expect("Could not convert to u64"),
        range_start,
    );

    example_query::Variables {
        filter: FilterCriteria {
            addresses: Some(addresses.into_iter().map(|v| format!("{:#x}", v)).collect()),
            topics: Some(vec![topics
                .into_iter()
                .map(|v| format!("{:#x}", v))
                .collect()]),
            from_block: Some(format!("{:#x}", start_block)),
            to_block: Some(format!("{:#x}", range_end)),
        },
    }
}
