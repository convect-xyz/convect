use crate::{
    fetcher::web3::client::Web3ClientImpl,
    manifest::{LogConfig, Manifest, TransactionConfig},
    networks::{get_first_polling_url, get_supported_network, FetchStrategyType},
};

use super::{graphql::GraphqlFetchStrategyImpl, jsonrpc::JsonRpcFetcherImpl, FetchStrategy};

pub fn get_eligible_tx_configs<'a>(
    manifest: &'a Manifest,
    chain_id: u64,
    range_start: u64,
) -> Vec<(TransactionConfig, Vec<LogConfig>)> {
    let is_tx_config_after_start =
        |tx_config: &TransactionConfig| match tx_config.get_start_block(chain_id) {
            Some(tx_cfg_start_block) => range_start >= tx_cfg_start_block,
            None => true,
        };

    let should_run_on_chain = |tx_config: &TransactionConfig| match &tx_config.chains {
        Some(chains) => chains.contains(&(chain_id as i64)),
        None => true,
    };

    manifest
        .get_tx_configs_with_log_configs()
        .into_iter()
        .filter(|(tx_cfg, _)| is_tx_config_after_start(tx_cfg) && should_run_on_chain(tx_cfg))
        .collect()
}

pub fn get_strategy_for_chain_id(chain_id: u64) -> Box<dyn FetchStrategy> {
    let network = get_supported_network(chain_id).unwrap();

    match &network.fetch_strategy {
        FetchStrategyType::Graphql => {
            return Box::new(GraphqlFetchStrategyImpl::with_defaults(chain_id));
        }
        FetchStrategyType::Jsonrpc => {
            return Box::new(JsonRpcFetcherImpl::new(Web3ClientImpl::new(
                chain_id,
                vec![get_first_polling_url(chain_id)],
            )))
        }
    }
}
