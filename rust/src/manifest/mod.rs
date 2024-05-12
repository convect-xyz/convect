use serde::Deserialize;
use std::env;

#[derive(Deserialize)]
pub struct Manifest {
    pub log_configs: Vec<LogConfig>,
}

impl Manifest {
    pub async fn from_env() -> Result<Manifest, errors::ManifestFromEnvError> {
        let config = aws_config::load_from_env().await;
        let s3_client = aws_sdk_s3::Client::new(&config);

        let bucket = env::var("MANIFEST_BUCKET")?;
        let prefix = env::var("MANIFEST_PREFIX")?;
        let object = s3_client
            .get_object()
            .bucket(bucket)
            .key(prefix)
            .send()
            .await?;
        let data = object.body.collect().await?;
        let content = String::from_utf8(data.into_bytes().to_vec())?;

        serde_json::from_str(&content).map_err(|err| errors::ManifestFromEnvError::from(err))
    }
}

#[derive(Deserialize)]
pub struct LogConfig {
    pub address: String,
    pub topics: Vec<String>,
}

mod errors {
    use aws_sdk_s3::{error::SdkError, operation::get_object::GetObjectError};
    use std::{env::VarError, string::FromUtf8Error};

    #[derive(Debug, Clone)]
    pub enum ManifestFromEnvError {
        EnvError(VarError),
        InvalidManifest(String),
        S3Error(String),
    }

    impl From<VarError> for ManifestFromEnvError {
        fn from(e: VarError) -> Self {
            Self::EnvError(e)
        }
    }

    impl From<serde_json::Error> for ManifestFromEnvError {
        fn from(e: serde_json::Error) -> Self {
            Self::InvalidManifest(format!("Invalid manifest: {:?}", e))
        }
    }

    impl From<SdkError<GetObjectError>> for ManifestFromEnvError {
        fn from(e: SdkError<GetObjectError>) -> Self {
            Self::S3Error(format!("S3 Error: {:?}", e))
        }
    }

    impl From<aws_smithy_types::byte_stream::error::Error> for ManifestFromEnvError {
        fn from(e: aws_smithy_types::byte_stream::error::Error) -> Self {
            Self::InvalidManifest(format!("Byte Stream Error: {:?}", e))
        }
    }

    impl From<FromUtf8Error> for ManifestFromEnvError {
        fn from(e: FromUtf8Error) -> Self {
            Self::InvalidManifest(format!("Invalid UTF-8 in Manifest: {:?}", e))
        }
    }
}
