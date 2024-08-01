use async_trait::async_trait;
use aws_sdk_lambda::error::BoxError;
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
pub struct EtherscanErrorResponse {
    pub status: String,
    pub message: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ContractCreationInfo {
    #[serde(rename = "contractAddress")]
    pub contract_address: String,
    #[serde(rename = "txHash")]
    pub tx_hash: String,
}

#[async_trait]
pub trait ContractInfoProvider {
    async fn get_contract_creation_info(
        &self,
        contract_addresses: Vec<String>,
    ) -> Result<Vec<ContractCreationInfo>, BoxError>;
}

pub struct EtherscanContractInfoProvider {
    etherscan_api_key: String,
    etherscan_like: String,
}

impl EtherscanContractInfoProvider {
    pub fn new(etherscan_api_key: String, etherscan_like: String) -> Self {
        Self {
            etherscan_api_key,
            etherscan_like,
        }
    }
}

#[async_trait]
impl ContractInfoProvider for EtherscanContractInfoProvider {
    async fn get_contract_creation_info(
        &self,
        contract_addresses: Vec<String>,
    ) -> Result<Vec<ContractCreationInfo>, BoxError> {
        let url = format!(
        "{etherscan_like}/api?module=contract&action=getcontractcreation&contractaddresses={contract_addresses}&apikey={api_key}",
        etherscan_like = self.etherscan_like,
        contract_addresses = contract_addresses.join(","),
        api_key = self.etherscan_api_key
      );

        let response = reqwest::get(url).await?;
        let response_body = response.text().await?;
        let response: EtherscanResponse<Vec<ContractCreationInfo>> =
            serde_json::from_str(&response_body)?;

        match response {
            EtherscanResponse::Success { result, .. } => Ok(result),
            EtherscanResponse::Error { .. } => Ok(vec![]),
        }
    }
}
