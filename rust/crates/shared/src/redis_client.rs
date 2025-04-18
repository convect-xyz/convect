use std::{borrow::Borrow, sync::Arc};

use async_trait::async_trait;
use futures::lock::Mutex;
use redis::{AsyncCommands, FromRedisValue, RedisError, RedisResult, ToRedisArgs, Value};
use tokio_retry::{strategy::jitter, Retry};

#[derive(Debug, Clone)]
pub enum ConvectRedisValue {
    String(String),
    I64(i64),
    USize(usize),
    List(Vec<ConvectRedisValue>),
    Tuple2(Box<(ConvectRedisValue, ConvectRedisValue)>),
    Okay,
    Nil,
}

pub trait FromConvectRedisValue {
    fn from_convect_redis_value(value: ConvectRedisValue) -> Self;
}

pub trait IntoOriginalValue<T: FromConvectRedisValue> {
    fn into_original_value(self) -> T;
}

impl<T: FromConvectRedisValue> IntoOriginalValue<T> for ConvectRedisValue {
    fn into_original_value(self) -> T {
        T::from_convect_redis_value(self)
    }
}

impl From<String> for ConvectRedisValue {
    fn from(value: String) -> Self {
        ConvectRedisValue::String(value)
    }
}

impl From<i64> for ConvectRedisValue {
    fn from(value: i64) -> Self {
        ConvectRedisValue::I64(value)
    }
}

impl FromConvectRedisValue for String {
    fn from_convect_redis_value(value: ConvectRedisValue) -> Self {
        match value {
            ConvectRedisValue::String(value) => value,
            value => panic!("Cannot convert {:?} to String", value),
        }
    }
}

impl FromConvectRedisValue for i64 {
    fn from_convect_redis_value(value: ConvectRedisValue) -> Self {
        match value {
            ConvectRedisValue::I64(value) => value,
            value => panic!("Cannot convert {:?} to i64", value),
        }
    }
}

impl<T1, T2> FromConvectRedisValue for (T1, T2)
where
    T1: FromConvectRedisValue,
    T2: FromConvectRedisValue,
{
    fn from_convect_redis_value(value: ConvectRedisValue) -> Self {
        match value {
            ConvectRedisValue::Tuple2(value) => {
                let (v1, v2) = *value;
                (
                    T1::from_convect_redis_value(v1),
                    T2::from_convect_redis_value(v2),
                )
            }
            ConvectRedisValue::List(values) => {
                let mut values = values.into_iter();
                (
                    T1::from_convect_redis_value(values.next().unwrap()),
                    T2::from_convect_redis_value(values.next().unwrap()),
                )
            }
            value => panic!("Cannot convert {:?} to (T1, T2)", value),
        }
    }
}

impl<T: FromConvectRedisValue> FromConvectRedisValue for Option<T> {
    fn from_convect_redis_value(value: ConvectRedisValue) -> Self {
        match value {
            ConvectRedisValue::Nil => None,
            value => Some(T::from_convect_redis_value(value)),
        }
    }
}

// For taking a convect redis value and converting it to a redis value
impl ToRedisArgs for ConvectRedisValue {
    fn write_redis_args<W>(&self, out: &mut W)
    where
        W: ?Sized + redis::RedisWrite,
    {
        match self {
            ConvectRedisValue::String(value) => value.write_redis_args(out),
            ConvectRedisValue::I64(value) => value.write_redis_args(out),
            ConvectRedisValue::USize(value) => value.write_redis_args(out),
            ConvectRedisValue::List(value) => value.write_redis_args(out),
            ConvectRedisValue::Tuple2(value) => {
                let value: &(ConvectRedisValue, ConvectRedisValue) = value.borrow();
                value.write_redis_args(out)
            }
            ConvectRedisValue::Nil => out.write_arg(b"NIL"),
            ConvectRedisValue::Okay => out.write_arg(b"OK"),
        }
    }
}

impl FromRedisValue for ConvectRedisValue {
    fn from_redis_value(value: &Value) -> RedisResult<Self> {
        match value {
            Value::Bulk(values) => Ok(ConvectRedisValue::List(
                values
                    .iter()
                    .map(|v| Self::from_redis_value(v).unwrap())
                    .collect(),
            )),
            Value::Data(bytes) => Ok(ConvectRedisValue::String(
                String::from_utf8(bytes.clone()).unwrap().to_string(),
            )),
            Value::Int(value) => Ok(ConvectRedisValue::I64(*value)),
            Value::Status(value) => Ok(ConvectRedisValue::String(value.to_string())),
            Value::Okay => Ok(ConvectRedisValue::Okay),
            Value::Nil => Ok(ConvectRedisValue::Nil),
        }
    }
}

#[async_trait]
pub trait RedisClient: Send + Sync + std::fmt::Debug {
    async fn mget(&self, key: Vec<String>) -> Result<ConvectRedisValue, errors::RedisClientError>;

    async fn mset<'a>(
        &'a self,
        items: &'a [(String, ConvectRedisValue)],
    ) -> Result<ConvectRedisValue, errors::RedisClientError>;

    async fn get(&self, key: String) -> Result<ConvectRedisValue, errors::RedisClientError>;

    async fn set(
        &self,
        key: String,
        value: ConvectRedisValue,
    ) -> Result<ConvectRedisValue, errors::RedisClientError>;

    async fn incr(
        &self,
        key: String,
        delta: i64,
    ) -> Result<ConvectRedisValue, errors::RedisClientError>;

    async fn reconnect(&self) -> Result<(), errors::RedisClientError>;
}

#[derive(Clone, Debug)]
pub struct RedisClientImpl {
    url: String,
    connection: Arc<Mutex<redis::aio::MultiplexedConnection>>,
}

impl RedisClientImpl {
    pub async fn new(url: &str) -> Self {
        let connection = Self::open(url).await.unwrap();

        Self {
            url: url.to_string(),
            connection: Arc::new(Mutex::new(connection)),
        }
    }

    async fn open(
        url: &str,
    ) -> Result<redis::aio::MultiplexedConnection, errors::RedisClientError> {
        let connection = redis::Client::open(url)
            .unwrap()
            .get_multiplexed_async_connection()
            .await
            .unwrap();
        Ok(connection)
    }

    async fn with_retry<Fn, I, Fut>(&self, func: Fn) -> Result<I, RedisError>
    where
        Fn: FnMut(redis::aio::MultiplexedConnection) -> Fut,
        Fut: std::future::Future<Output = Result<I, RedisError>>,
    {
        let retry_strategy = tokio_retry::strategy::FixedInterval::from_millis(200)
            .map(jitter)
            .take(3);

        let func = Mutex::new(func);

        Retry::spawn(retry_strategy, || async {
            let con = self.connection.lock().await.clone();
            let mut func = func.lock().await;
            let result = func(con).await;
            match result {
                Ok(result) => Ok(result),
                Err(err) => {
                    if err.is_connection_dropped() {
                        self.reconnect().await.unwrap();
                    }

                    Err(err)
                }
            }
        })
        .await
    }
}

#[async_trait]
impl RedisClient for RedisClientImpl {
    #[tracing::instrument(skip_all, err)]
    async fn mget(&self, keys: Vec<String>) -> Result<ConvectRedisValue, errors::RedisClientError> {
        let result: ConvectRedisValue = self
            .with_retry(move |mut con| {
                let keys = keys.clone();
                async move { con.mget(keys).await }
            })
            .await?;
        Ok(result)
    }

    #[tracing::instrument(skip_all, err)]
    async fn mset<'a>(
        &'a self,
        items: &'a [(String, ConvectRedisValue)],
    ) -> Result<ConvectRedisValue, errors::RedisClientError> {
        let result: ConvectRedisValue = self
            .with_retry(move |mut con| {
                let items = items.clone();
                async move { con.mset(items).await }
            })
            .await?;
        Ok(result)
    }

    #[tracing::instrument(skip_all, err)]
    async fn get(&self, key: String) -> Result<ConvectRedisValue, errors::RedisClientError> {
        let result: ConvectRedisValue = self
            .with_retry(move |mut con| {
                let key = key.clone();
                async move { con.get(key).await }
            })
            .await?;
        Ok(result)
    }

    #[tracing::instrument(skip_all, err)]
    async fn set(
        &self,
        key: String,
        value: ConvectRedisValue,
    ) -> Result<ConvectRedisValue, errors::RedisClientError> {
        let result: ConvectRedisValue = self
            .with_retry(move |mut con| {
                let key = key.clone();
                let value = value.clone();
                async move { con.set(&key, value).await }
            })
            .await?;
        Ok(result)
    }

    #[tracing::instrument(skip_all, err)]
    async fn incr(
        &self,
        key: String,
        delta: i64,
    ) -> Result<ConvectRedisValue, errors::RedisClientError> {
        let result: ConvectRedisValue = self
            .with_retry(move |mut con| {
                let key = key.clone();
                let delta = delta.clone();
                async move { con.incr(key, delta).await }
            })
            .await?;
        Ok(result)
    }

    #[tracing::instrument(skip_all, err)]
    async fn reconnect(&self) -> Result<(), errors::RedisClientError> {
        let mut con = self.connection.lock().await;
        *con = Self::open(&self.url).await?;
        Ok(())
    }
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum RedisClientError {
        #[error("Redis error: {0}")]
        Redis(#[from] redis::RedisError),
    }

    impl RedisClientError {
        pub fn is_connection_dropped(&self) -> bool {
            match self {
                RedisClientError::Redis(e) => e.is_connection_dropped(),
            }
        }
    }
}
