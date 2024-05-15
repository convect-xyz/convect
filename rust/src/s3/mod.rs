use aws_sdk_s3 as s3;

use s3::primitives::{ByteStream, SdkBody};

pub trait S3 {
    async fn get_s3_object(
        &self,
        bucket: &str,
        prefix: &str,
    ) -> Result<String, errors::GetS3ObjectError>;
    async fn put_s3_object(
        &self,
        bucket: &str,
        prefix: &str,
        content: String,
    ) -> Result<(), errors::PutS3ObjectError>;
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
}

pub mod errors {
    use aws_sdk_s3::{
        error::SdkError,
        operation::{get_object::GetObjectError, put_object::PutObjectError},
    };
    use aws_smithy_types::byte_stream;
    use std::string::FromUtf8Error;

    #[derive(Debug)]
    pub enum GetS3ObjectError {
        S3ClientError(SdkError<GetObjectError>),
        ParseError(String),
    }

    impl From<SdkError<GetObjectError>> for GetS3ObjectError {
        fn from(e: SdkError<GetObjectError>) -> Self {
            Self::S3ClientError(e)
        }
    }

    impl From<byte_stream::error::Error> for GetS3ObjectError {
        fn from(e: byte_stream::error::Error) -> Self {
            Self::ParseError(format!("{:?}", e))
        }
    }

    impl From<FromUtf8Error> for GetS3ObjectError {
        fn from(e: FromUtf8Error) -> Self {
            Self::ParseError(format!("Invalid UTF-8: {:?}", e))
        }
    }

    #[derive(Debug)]
    pub enum PutS3ObjectError {
        S3ClientError(SdkError<PutObjectError>),
    }

    impl From<SdkError<PutObjectError>> for PutS3ObjectError {
        fn from(e: SdkError<PutObjectError>) -> Self {
            Self::S3ClientError(e)
        }
    }
}
