use axum::{
    routing::{get, post},
    Router,
};
use lambda_extension::{service_fn, Error, LambdaEvent, NextEvent};

async fn my_extension(event: LambdaEvent) -> Result<(), Error> {
    match event.next {
        NextEvent::Shutdown(_e) => {}
        NextEvent::Invoke(_e) => {}
    }
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    let app = Router::new()
        .route("/results", post(results::handler))
        .route("/pipeline", get(get_pipeline::handler));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:4121").await.unwrap();

    tokio::spawn(async {
        println!("Starting server");
        axum::serve(listener, app).await.unwrap();
    });

    // tracing_subscriber::fmt()
    //     .with_max_level(tracing::Level::INFO)
    //     .with_target(false)
    //     .without_time()
    //     .init();

    let func = service_fn(my_extension);

    lambda_extension::run(func).await
}

mod results {
    use std::env;
    use std::time::SystemTime;

    use aws_config::BehaviorVersion;
    use aws_sdk_sqs::types::ChangeMessageVisibilityBatchRequestEntry;
    use axum::Json;
    use diesel_async::RunQueryDsl;
    use ingest::establish_connection;
    use ingest::types::processing;
    use ingest::{models::ProcessedTransaction, schema::processed_transactions};
    use serde::Deserialize;
    use serde_json::{json, Value};

    #[derive(Deserialize, Debug)]
    pub struct TransactionResult {
        pub transaction_hash: String,
        pub successful_labels: Vec<String>,
        pub failed_label: Option<String>,
    }

    #[derive(Deserialize, Debug)]
    pub struct Request {
        pub message_ids: Vec<String>,
        pub results: Vec<TransactionResult>,
    }

    pub async fn handler(Json(payload): Json<Request>) -> Json<Value> {
        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let sqs_client = aws_sdk_sqs::Client::new(&config);
        let handler_id = env::var("HANDLER_ID").expect("Handler ID env not set");
        let mut state = processing::State::load(handler_id);

        let failed_tx = payload.results.iter().find(|v| v.failed_label.is_some());

        if let Some(failed_tx) = failed_tx {
            let update_r = state
                .update()
                .set_error_label(failed_tx.failed_label.as_ref().unwrap().to_string())
                .set_error_tx(failed_tx.transaction_hash.to_string())
                .send();

            match update_r {
                Ok(_) => println!("Updated pipeline"),
                Err(e) => println!("Error: {:?}", e),
            }

            let result = sqs_client
                .change_message_visibility_batch()
                .set_queue_url(Some(
                    env::var("TRANSACTION_QUEUE_URL").expect("TX Queue not defined"),
                ))
                .set_entries(Some(
                    payload
                        .message_ids
                        .into_iter()
                        .map(|v| {
                            ChangeMessageVisibilityBatchRequestEntry::builder()
                                .set_id(Some(uuid::Uuid::new_v4().to_string()))
                                .set_receipt_handle(Some(v))
                                .set_visibility_timeout(Some(180))
                                .build()
                                .unwrap()
                        })
                        .collect(),
                ))
                .send()
                .await;

            match result {
                Ok(_) => println!("Changed message visibility"),
                Err(e) => println!("Error: {:?}", e),
            }

            return Json(json!({"ok": true}));
        } else {
            let _ = state
                .update()
                .set_error_label("".to_string())
                .set_error_tx("".to_string())
                .send();
        }

        let data: Vec<_> = payload
            .results
            .iter()
            .map(|r| {
                let mut rows = Vec::new();

                for label in r.successful_labels.iter() {
                    rows.push(ProcessedTransaction {
                        transaction_hash: r.transaction_hash.clone(),
                        label: label.clone(),
                        status: "SUCCESS".to_string(),
                        timestamp: SystemTime::now(),
                    })
                }

                if let Some(label) = r.failed_label.as_ref() {
                    rows.push(ProcessedTransaction {
                        transaction_hash: r.transaction_hash.clone(),
                        label: label.clone(),
                        status: "FAILED".to_string(),
                        timestamp: SystemTime::now(),
                    })
                }

                rows
            })
            .flatten()
            .collect();

        let mut conn = establish_connection().await;
        let r = diesel::insert_into(processed_transactions::table)
            .values(data)
            .execute(&mut conn)
            .await;

        match r {
            Ok(_) => println!("Inserted"),
            Err(e) => println!("Error {:?}", e),
        }

        return Json(json!({"ok": true}));
    }
}

mod get_pipeline {
    use axum::extract::Json;
    use ingest::types::processing;
    use std::env;

    pub async fn handler() -> Json<processing::Inner> {
        let handler_id = env::var("HANDLER_ID").expect("Handler ID env not set");
        let pipeline: processing::State = processing::State::load(handler_id);

        return Json(pipeline.into_inner());
    }
}
