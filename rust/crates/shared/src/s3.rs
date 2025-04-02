use std::fmt::Debug;

use aws_sdk_s3 as s3;

use async_trait::async_trait;
use base64::{engine::general_purpose, Engine};
use s3::primitives::{ByteStream, SdkBody};

pub struct EncryptionConfig {
    pub key: String,
    pub algorithm: String,
}

#[async_trait]
pub trait S3: Send + Sync + Debug {
    async fn get_object(
        &self,
        bucket: &str,
        prefix: &str,
    ) -> Result<String, errors::GetS3ObjectError>;
    async fn get_object_encrypted(
        &self,
        bucket: &str,
        prefix: &str,
        encryption_config: &EncryptionConfig,
    ) -> Result<String, errors::GetS3ObjectError>;
    async fn put_object(
        &self,
        bucket: &str,
        prefix: &str,
        content: String,
    ) -> Result<(), errors::PutS3ObjectError>;
    async fn delete_object(
        &self,
        bucket: &str,
        prefix: &str,
    ) -> Result<(), errors::DeleteS3ObjectError>;
}

#[async_trait]
impl S3 for aws_sdk_s3::Client {
    async fn get_object(
        &self,
        bucket: &str,
        prefix: &str,
    ) -> Result<String, errors::GetS3ObjectError> {
        let output = self.get_object().bucket(bucket).key(prefix).send().await?;

        let data = output.body.collect().await?;

        return Ok(String::from_utf8(data.into_bytes().to_vec())?);
    }

    async fn get_object_encrypted(
        &self,
        bucket: &str,
        prefix: &str,
        encryption_config: &EncryptionConfig,
    ) -> Result<String, errors::GetS3ObjectError> {
        let key_md5_hash = md5::compute(encryption_config.key.clone());
        let encoded_key_md5_hash = general_purpose::STANDARD.encode(key_md5_hash.0);

        let output = self
            .get_object()
            .bucket(bucket)
            .key(prefix)
            .sse_customer_key(encryption_config.key.clone())
            .sse_customer_algorithm(encryption_config.algorithm.clone())
            .sse_customer_key_md5(encoded_key_md5_hash)
            .send()
            .await?;

        let data = output.body.collect().await?;

        return Ok(String::from_utf8(data.into_bytes().to_vec())?);
    }

    async fn put_object(
        &self,
        bucket: &str,
        prefix: &str,
        content: String,
    ) -> Result<(), errors::PutS3ObjectError> {
        self.put_object()
            .bucket(bucket)
            .key(prefix)
            .body(ByteStream::new(SdkBody::from(content)))
            .send()
            .await?;

        Ok(())
    }

    async fn delete_object(
        &self,
        bucket: &str,
        prefix: &str,
    ) -> Result<(), errors::DeleteS3ObjectError> {
        self.delete_object()
            .bucket(bucket)
            .key(prefix)
            .send()
            .await?;

        Ok(())
    }
}

pub mod errors {
    use aws_sdk_s3::{
        error::SdkError,
        operation::{
            delete_object::DeleteObjectError, get_object::GetObjectError,
            put_object::PutObjectError,
        },
    };
    use aws_smithy_types::byte_stream;
    use std::string::FromUtf8Error;
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum GetS3ObjectError {
        #[error("SDK error {0}")]
        TransportError(#[from] SdkError<GetObjectError>),
        #[error("Parse error {0}")]
        Utf8Error(#[from] FromUtf8Error),
        #[error("Parse error {0}")]
        ByteStreamError(#[from] byte_stream::error::Error),
    }

    #[derive(Error, Debug)]
    pub enum PutS3ObjectError {
        #[error("SDK error {0}")]
        TransportError(#[from] SdkError<PutObjectError>),
    }

    #[derive(Error, Debug)]
    pub enum DeleteS3ObjectError {
        #[error("SDK error {0}")]
        TransportError(#[from] SdkError<DeleteObjectError>),
    }
}
