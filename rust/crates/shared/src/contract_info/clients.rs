use async_trait::async_trait;

#[async_trait]
pub trait EtherscanClient {
    async fn get_contract_creation_info(
        &self,
        contract_addresses: Vec<String>,
    ) -> Result<Vec<responses::ContractCreationInfo>, errors::EtherscanError>;
}

pub struct EtherscanClientImpl {
    etherscan_api_key: String,
    etherscan_like: String,
}

impl EtherscanClientImpl {
    pub fn new(etherscan_api_key: String, etherscan_like: String) -> Self {
        Self {
            etherscan_api_key,
            etherscan_like,
        }
    }
}

#[async_trait]
impl EtherscanClient for EtherscanClientImpl {
    async fn get_contract_creation_info(
        &self,
        contract_addresses: Vec<String>,
    ) -> Result<Vec<responses::ContractCreationInfo>, errors::EtherscanError> {
        let url = format!(
                "{etherscan_like}/api?module=contract&action=getcontractcreation&contractaddresses={contract_addresses}&apikey={api_key}",
                etherscan_like = self.etherscan_like,
                contract_addresses = contract_addresses.join(","),
                api_key = self.etherscan_api_key
              );

        let response = reqwest::get(url).await?.text().await?;
        let response: responses::EtherscanResponse<Vec<responses::ContractCreationInfo>> =
            serde_json::from_str(&response)?;

        match response {
            responses::EtherscanResponse::Success { result, .. } => Ok(result),
            responses::EtherscanResponse::Error { message, .. } => {
                Err(errors::EtherscanError::EtherscanError(message))
            }
        }
    }
}

pub mod responses {
    use serde::Deserialize;

    #[derive(Debug, Deserialize, Clone)]
    #[serde(untagged)]
    pub enum EtherscanResponse<T> {
        Success {
            status: String,
            message: String,
            result: T,
        },
        Error {
            status: String,
            message: String,
        },
    }

    #[derive(Debug, Deserialize, Clone)]
    pub struct ContractCreationInfo {
        #[serde(rename = "contractAddress")]
        pub contract_address: String,
        #[serde(rename = "txHash")]
        pub tx_hash: String,
    }
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum EtherscanError {
        #[error("Reqwest error: {0}")]
        ReqwestError(#[from] reqwest::Error),

        #[error("Etherscan error: {0}")]
        EtherscanError(String),

        #[error("Serde error: {0}")]
        SerdeError(#[from] serde_json::Error),
    }
}
