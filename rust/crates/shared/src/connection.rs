use crate::configuration::RefreshingEnvironmentConfig;
use diesel::prelude::*;
use diesel_async::pooled_connection::{deadpool::Pool, AsyncDieselConnectionManager};
use diesel_async::pooled_connection::{ManagerConfig, RecyclingMethod};
use diesel_async::AsyncPgConnection;
use openssl::ssl::{SslConnector, SslMethod, SslVerifyMode};
use postgres_openssl::MakeTlsConnector;

pub type DbPool = Pool<AsyncPgConnection>;

pub async fn establish_connection_pool() -> DbPool {
    let environment = RefreshingEnvironmentConfig::new().await;
    let database_url = environment.get_config().await.database.url;

    let mut manager_config = ManagerConfig::default();
    manager_config.recycling_method = RecyclingMethod::Fast;

    manager_config.custom_setup = Box::new(|_| {
        Box::pin(async move {
            let environment = RefreshingEnvironmentConfig::new().await;
            let database_url = environment.get_config().await.database.url;

            let mut builder = SslConnector::builder(SslMethod::tls()).unwrap();
            builder.set_verify(SslVerifyMode::NONE);

            let connector = MakeTlsConnector::new(builder.build());
            let (client, connection) = tokio_postgres::connect(&database_url, connector)
                .await
                .map_err(|e| ConnectionError::BadConnection(e.to_string()))?;

            tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });

            Ok(AsyncPgConnection::try_from(client).await?)
        })
    });

    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new_with_config(
        database_url,
        manager_config,
    );

    Pool::builder(manager)
        .max_size(10) // Set the maximum number of connections in the pool
        .build()
        .expect("Failed to create pool")
}
