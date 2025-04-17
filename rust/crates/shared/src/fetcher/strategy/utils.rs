use std::collections::HashMap;

use std::sync::Mutex;

use crate::{
    configuration::FetchStrategyType, fetcher::web3::client::Web3ClientImpl,
    networks::get_supported_network,
};
use lazy_static::lazy_static;

use super::{graphql::GraphqlFetchStrategyImpl, jsonrpc::JsonRpcFetcherImpl, FetchStrategy};

lazy_static! {
    static ref web3_client_mutex: Mutex<HashMap<u64, Web3ClientImpl>> = Mutex::new(HashMap::new());
}

#[tracing::instrument(skip_all)]
async fn get_web3_client(chain_id: u64) -> Web3ClientImpl {
    let mut web3_clients = web3_client_mutex.lock().unwrap();

    if !web3_clients.contains_key(&chain_id) {
        web3_clients.insert(
            chain_id,
            Web3ClientImpl::new(
                chain_id,
                get_supported_network(chain_id)
                    .await
                    .unwrap()
                    .polling_urls
                    .clone(),
            ),
        );
    }

    web3_clients.get(&chain_id).unwrap().clone()
}

pub async fn get_strategy_for_chain_id(chain_id: u64) -> Box<dyn FetchStrategy> {
    let network = get_supported_network(chain_id).await.unwrap();

    match &network.fetch_strategy {
        FetchStrategyType::Graphql => {
            return Box::new(GraphqlFetchStrategyImpl::with_defaults(chain_id).await);
        }
        FetchStrategyType::Jsonrpc => {
            return Box::new(JsonRpcFetcherImpl::new(get_web3_client(chain_id).await));
        }
    }
}
