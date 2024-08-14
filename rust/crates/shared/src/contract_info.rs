use async_trait::async_trait;
use aws_sdk_lambda::error::BoxError;
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
#[serde(untagged)]
enum EtherscanResponse<T> {
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
        let mut info = Vec::new();
        let mut contract_addresses = contract_addresses.clone();
        contract_addresses.sort();
        contract_addresses.dedup();

        for chunk in contract_addresses.chunks(5) {
            let url = format!(
                "{etherscan_like}/api?module=contract&action=getcontractcreation&contractaddresses={contract_addresses}&apikey={api_key}",
                etherscan_like = self.etherscan_like,
                contract_addresses = chunk.join(","),
                api_key = self.etherscan_api_key
              );

            let response = reqwest::get(url).await?;
            let response_body = response.text().await?;
            let response: EtherscanResponse<Vec<ContractCreationInfo>> =
                serde_json::from_str(&response_body)?;

            match response {
                EtherscanResponse::Success { result, .. } => info.extend(result),
                _ => {}
            };
        }

        Ok(info)
    }
}
