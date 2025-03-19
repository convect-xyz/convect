use std::collections::HashMap;

use std::sync::Mutex;

use crate::{
    fetcher::web3::client::Web3ClientImpl,
    manifest::{LogConfig, Manifest, TransactionConfig},
    networks::{get_supported_network, FetchStrategyType},
};
use lazy_static::lazy_static;

use super::{graphql::GraphqlFetchStrategyImpl, jsonrpc::JsonRpcFetcherImpl, FetchStrategy};

lazy_static! {
    static ref web3_client_mutex: Mutex<HashMap<u64, Web3ClientImpl>> = Mutex::new(HashMap::new());
}

#[tracing::instrument(skip_all)]
fn get_web3_client(chain_id: u64) -> Web3ClientImpl {
    let mut web3_clients = web3_client_mutex.lock().unwrap();

    if !web3_clients.contains_key(&chain_id) {
        web3_clients.insert(
            chain_id,
            Web3ClientImpl::new(
                chain_id,
                get_supported_network(chain_id)
                    .unwrap()
                    .polling_urls
                    .clone(),
            ),
        );
    }

    web3_clients.get(&chain_id).unwrap().clone()
}

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
        .filter(|(tx_cfg, _)| {
            println!(
                "Is Tx Config After Start: {:?}",
                is_tx_config_after_start(tx_cfg)
            );
            println!("Should Run On Chain: {:?}", should_run_on_chain(tx_cfg));

            is_tx_config_after_start(tx_cfg) && should_run_on_chain(tx_cfg)
        })
        .collect()
}

pub fn get_strategy_for_chain_id(chain_id: u64) -> Box<dyn FetchStrategy> {
    let network = get_supported_network(chain_id).unwrap();

    match &network.fetch_strategy {
        FetchStrategyType::Graphql => {
            return Box::new(GraphqlFetchStrategyImpl::with_defaults(chain_id));
        }
        FetchStrategyType::Jsonrpc => {
            return Box::new(JsonRpcFetcherImpl::new(get_web3_client(chain_id)));
        }
    }
}
