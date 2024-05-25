use std::thread;

use lambda_extension::tracing;
use lambda_extension::{service_fn, Error, LambdaEvent, NextEvent};
use rouille::Response;

async fn my_extension(event: LambdaEvent) -> Result<(), Error> {
    match event.next {
        NextEvent::Shutdown(_e) => {
            // do something with the shutdown event
        }
        NextEvent::Invoke(_e) => {}
    }
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        // disable printing the name of the module in every log line.
        .with_target(false)
        // disabling time is handy because CloudWatch will add the ingestion time.
        .without_time()
        .init();

    thread::spawn(|| {
        println!("Starting server");
        rouille::start_server("localhost:4121", move |_request| {
            Response::text("hello world")
        })
    });

    let func = service_fn(my_extension);
    lambda_extension::run(func).await
}
