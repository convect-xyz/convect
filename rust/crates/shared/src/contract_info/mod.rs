use async_trait::async_trait;
use clients::{responses::ContractCreationInfo, EtherscanClient, EtherscanClientImpl};

mod clients;

#[async_trait]
pub trait ContractInfoProvider: Sync + Send {
    type Error: std::error::Error;

    async fn get_contract_creation_info(
        &self,
        contract_addresses: Vec<String>,
    ) -> Result<Vec<clients::responses::ContractCreationInfo>, Self::Error>;
}

pub struct EtherscanContractInfoProvider<T: clients::EtherscanClient + Sync + Send> {
    etherscan_client: T,
}

impl EtherscanContractInfoProvider<EtherscanClientImpl> {
    pub fn new(etherscan_api_key: String, etherscan_like: String) -> Self {
        Self {
            etherscan_client: EtherscanClientImpl::new(etherscan_api_key, etherscan_like),
        }
    }
}

#[async_trait]
impl<T: EtherscanClient + Sync + Send> ContractInfoProvider for EtherscanContractInfoProvider<T> {
    type Error = errors::EtherscanContractInfoProviderError;

    async fn get_contract_creation_info(
        &self,
        contract_addresses: Vec<String>,
    ) -> Result<Vec<ContractCreationInfo>, Self::Error> {
        let mut contract_addresses = contract_addresses.clone();
        contract_addresses.sort();
        contract_addresses.dedup();

        let mut info = Vec::new();
        for chunk in contract_addresses.chunks(5) {
            info.extend(
                self.etherscan_client
                    .get_contract_creation_info(chunk.to_vec())
                    .await?
                    .into_iter(),
            );
        }

        Ok(info)
    }
}

pub mod errors {
    use super::clients::errors::EtherscanError;
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum EtherscanContractInfoProviderError {
        #[error("Etherscan error: {0}")]
        EtherscanError(#[from] EtherscanError),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::RwLock;

    struct MockEtherscanClient {
        contract_addresses: RwLock<Vec<String>>,
    }

    #[async_trait]
    impl EtherscanClient for MockEtherscanClient {
        async fn get_contract_creation_info(
            &self,
            contract_addresses: Vec<String>,
        ) -> Result<Vec<clients::responses::ContractCreationInfo>, clients::errors::EtherscanError>
        {
            *self.contract_addresses.write().unwrap() = contract_addresses.clone();

            Ok(vec![])
        }
    }

    #[tokio::test]
    async fn test_get_contract_creation_info_calls_with_no_duplicates() {
        // Arrange.
        let client = MockEtherscanClient {
            contract_addresses: RwLock::new(vec![]),
        };
        let provider = EtherscanContractInfoProvider {
            etherscan_client: client,
        };
        let mut expected_contract_addresses = vec![
            "0x0d1d4e623d10f9fba5db95830f7d3839406c6af2".to_string(),
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
            "0x6b175474e89094c44da98b954eedeac495271d0f".to_string(),
        ];

        // Act.
        let _ = provider
            .get_contract_creation_info(vec![
                "0x0d1d4e623d10f9fba5db95830f7d3839406c6af2".to_string(),
                "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
                "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
                "0x0d1d4e623d10f9fba5db95830f7d3839406c6af2".to_string(),
                "0x6b175474e89094c44da98b954eedeac495271d0f".to_string(),
            ])
            .await;

        // Assert.

        let mut observed_contract_addresses = provider
            .etherscan_client
            .contract_addresses
            .read()
            .unwrap()
            .clone();

        observed_contract_addresses.sort();
        expected_contract_addresses.sort();

        assert_eq!(observed_contract_addresses, expected_contract_addresses);
    }
}
