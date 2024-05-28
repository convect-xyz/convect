use diesel::prelude::*;
use diesel_async::AsyncPgConnection;
use dotenvy::dotenv;
use openssl::ssl::{SslConnector, SslMethod, SslVerifyMode};
use postgres_openssl::MakeTlsConnector;
use std::env;

pub async fn establish_connection() -> AsyncPgConnection {
    dotenv().ok();

    let mut builder = SslConnector::builder(SslMethod::tls()).unwrap();
    builder.set_verify(SslVerifyMode::NONE);

    let connector = MakeTlsConnector::new(builder.build());

    let (client, connection) = tokio_postgres::connect(
        &env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
        connector,
    )
    .await
    .unwrap();

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    AsyncPgConnection::try_from(client).await.unwrap()
}
