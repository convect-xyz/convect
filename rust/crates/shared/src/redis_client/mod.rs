use async_trait::async_trait;
use redis::{AsyncCommands, FromRedisValue, ToRedisArgs};
use tokio::sync::OnceCell;

static CONNECTION: OnceCell<redis::aio::MultiplexedConnection> = OnceCell::const_new();

async fn get_connection() -> &'static redis::aio::MultiplexedConnection {
    CONNECTION.get_or_init(|| async {
  redis::Client::open("rediss://default:AVNS_7BaBQxFTF74jG4c8B1T@db-redis-nyc3-60846-do-user-17204040-0.e.db.ondigitalocean.com:25061").unwrap().get_multiplexed_async_connection().await.unwrap()
}).await
}
#[async_trait]
pub trait RedisClient: Send + Sync + Clone {
    async fn mget<'a, K: ToRedisArgs + Send + Sync, RV: FromRedisValue>(
        &'a self,
        keys: K,
    ) -> Result<RV, errors::RedisClientError>;

    async fn mset<
        'a,
        K: ToRedisArgs + Send + Sync + 'a,
        V: ToRedisArgs + Send + Sync + 'a,
        RV: FromRedisValue,
    >(
        &'a self,
        items: &'a [(K, V)],
    ) -> Result<RV, errors::RedisClientError>;

    async fn get<'a, K: ToRedisArgs + Send + Sync, RV: FromRedisValue>(
        &'a self,
        key: K,
    ) -> Result<RV, errors::RedisClientError>;

    async fn set<'a, K: ToRedisArgs + Send + Sync, RV: FromRedisValue>(
        &'a self,
        key: K,
        value: &str,
    ) -> Result<RV, errors::RedisClientError>;

    async fn incr<
        'a,
        K: ToRedisArgs + Send + Sync,
        V: ToRedisArgs + Send + Sync,
        RV: FromRedisValue,
    >(
        &'a self,
        key: K,
        delta: V,
    ) -> Result<RV, errors::RedisClientError>;
}

#[derive(Clone)]
pub struct RedisClientImpl {
    connection: redis::aio::MultiplexedConnection,
}

impl RedisClientImpl {
    pub async fn new() -> Self {
        let connection = get_connection().await.clone();

        Self { connection }
    }
}

#[async_trait]
impl RedisClient for RedisClientImpl {
    async fn mget<'a, K: ToRedisArgs + Send + Sync, RV: FromRedisValue>(
        &'a self,
        keys: K,
    ) -> Result<RV, errors::RedisClientError> {
        let mut con = self.connection.clone();

        let result: RV = con.mget(keys).await?;
        Ok(result)
    }

    async fn mset<
        'a,
        K: ToRedisArgs + Send + Sync + 'a,
        V: ToRedisArgs + Send + Sync + 'a,
        RV: FromRedisValue,
    >(
        &'a self,
        items: &'a [(K, V)],
    ) -> Result<RV, errors::RedisClientError> {
        let mut con = self.connection.clone();

        let result: RV = con.mset(items).await?;
        Ok(result)
    }

    async fn get<'a, K: ToRedisArgs + Send + Sync, RV: FromRedisValue>(
        &'a self,
        key: K,
    ) -> Result<RV, errors::RedisClientError> {
        let mut con = self.connection.clone();

        let result: RV = con.get(key).await?;
        Ok(result)
    }

    async fn set<'a, K: ToRedisArgs + Send + Sync, RV: FromRedisValue>(
        &'a self,
        key: K,
        value: &str,
    ) -> Result<RV, errors::RedisClientError> {
        let mut con = self.connection.clone();

        let result: RV = con.set(key, value).await?;
        Ok(result)
    }

    async fn incr<
        'a,
        K: ToRedisArgs + Send + Sync,
        V: ToRedisArgs + Send + Sync,
        RV: FromRedisValue,
    >(
        &'a self,
        key: K,
        delta: V,
    ) -> Result<RV, errors::RedisClientError> {
        let mut con = self.connection.clone();

        let result: RV = con.incr(key, delta).await?;
        Ok(result)
    }
}

pub mod errors {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum RedisClientError {
        #[error("Redis error: {0}")]
        Redis(#[from] redis::RedisError),
    }
}
