use aws_sdk_s3 as s3;

use futures::Future;
use s3::primitives::{ByteStream, SdkBody};

pub trait S3: Send + Sync {
    fn get_s3_object(
        &self,
        bucket: &str,
        prefix: &str,
    ) -> impl Future<Output = Result<String, errors::GetS3ObjectError>>;
    fn put_s3_object(
        &self,
        bucket: &str,
        prefix: &str,
        content: String,
    ) -> impl Future<Output = Result<(), errors::PutS3ObjectError>>;
    fn delete_s3_object(
        &self,
        bucket: &str,
        prefix: &str,
    ) -> impl Future<Output = Result<(), errors::DeleteS3ObjectError>>;
}

impl S3 for aws_sdk_s3::Client {
    async fn get_s3_object(
        &self,
        bucket: &str,
        prefix: &str,
    ) -> Result<String, errors::GetS3ObjectError> {
        let output = self.get_object().bucket(bucket).key(prefix).send().await?;

        let data = output.body.collect().await?;

        return Ok(String::from_utf8(data.into_bytes().to_vec())?);
    }

    async fn put_s3_object(
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

    async fn delete_s3_object(
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
