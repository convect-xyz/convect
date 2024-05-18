use std::env;

use aws_lambda_events::event::sns::SnsEvent;
use aws_sdk_ecs::types::{
    AwsVpcConfiguration, ContainerOverride, KeyValuePair, NetworkConfiguration, TaskOverride,
};
use ingest::{
    api::{self},
    types::{manifest::Manifest, pipeline::Pipeline},
};
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};
use reqwest::blocking::Client;

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}

async fn function_handler(event: LambdaEvent<SnsEvent>) -> Result<(), Error> {
    let config = aws_config::load_from_env().await;
    let ecs_client = aws_sdk_ecs::Client::new(&config);
    let api = api::Api::new(&config);
    let handler_id = env::var("HANDLER_ID").expect("Handler ID not set");

    let client = Client::new();
    let res = client.get("https://google.com").send();

    println!("{:?}", res);

    let mut pipeline = Pipeline::load(handler_id);

    let incoming_block: u64 = event
        .payload
        .records
        .last()
        .unwrap()
        .sns
        .message
        .parse()
        .expect("Invalid SNS Message");

    // Will not sync while sync task already in progress
    // TODO: this should be added to a DLQ
    if pipeline
        .state()
        .eq(&ingest::types::pipeline::SyncState::SYNCING)
    {
        return Ok(());
    }

    // It is the responsibility of the ECS task to revert this status
    pipeline
        .update()
        .set_state(ingest::types::pipeline::SyncState::SYNCING)
        .send()
        .expect("Failed to update pipeline");

    println!("{:?}", pipeline.inner());

    // If block diff is too great, trigger fargate to do the work
    if incoming_block - pipeline.last_block().or(Some(0)).unwrap() > 1999 {
        return trigger_batch_sync_task(&ecs_client, &mut pipeline, incoming_block).await;
    }

    println!("State: {:?}", pipeline.state());

    let from_block = pipeline.last_block().map(|l| l + 1).or(Some(0)).unwrap();

    // We'll process the blocks here and add them to tx queue
    // We shouldn't need to update status here because max concurrency should be 1
    let manifest = Manifest::from_env().await.unwrap();

    let transactions = api
        .fetch_transactions()
        .set_manifest(&manifest)
        .set_start_block(from_block)
        .set_end_block(incoming_block)
        .send()
        .await
        .unwrap();

    println!("transactions: {:?}", transactions);

    let result = api
        .enqueue_transactions()
        .set_pipeline(&mut pipeline)
        .set_queue_url(env::var("TRANSACTION_QUEUE_URL").expect("Tx Queue URL not set"))
        .set_transactions(&transactions)
        .send()
        .await;

    match result {
        Ok(_) => pipeline
            .update()
            .set_last_block(incoming_block)
            .set_state(ingest::types::pipeline::SyncState::IDLE)
            .send(),
        Err(_) => pipeline
            .update()
            .set_state(ingest::types::pipeline::SyncState::FAILED)
            .send(),
    }
}

async fn trigger_batch_sync_task(
    ecs_client: &aws_sdk_ecs::Client,
    pipeline: &mut Pipeline,
    incoming_block: u64,
) -> Result<(), Error> {
    let version = env::var("VERSION").expect("Version ENV not defined");
    println!("Triggering batch sync");

    let result = ecs_client
        .run_task()
        .cluster("arn:aws:ecs:eu-west-1:730335604495:cluster/syncers")
        .task_definition(format!(
            "arn:aws:ecs:eu-west-1:730335604495:task-definition/syncer-{family_name}",
            family_name = version.replace(".", "-")
        ))
        .launch_type(aws_sdk_ecs::types::LaunchType::Fargate)
        .network_configuration(
            NetworkConfiguration::builder()
                .awsvpc_configuration(
                    AwsVpcConfiguration::builder()
                        .subnets("subnet-05d39f2476de29dc7".to_string())
                        .assign_public_ip(aws_sdk_ecs::types::AssignPublicIp::Enabled)
                        .build()
                        .unwrap(),
                )
                .build(),
        )
        .overrides(
            TaskOverride::builder()
                .container_overrides(
                    ContainerOverride::builder()
                        .name("syncer")
                        .set_environment(Some(vec![
                            create_key_value_pair(
                                "START_BLOCK".to_string(),
                                pipeline
                                    .last_block()
                                    .map(|l| l + 1)
                                    .or(Some(0))
                                    .unwrap()
                                    .to_string(),
                            ),
                            create_key_value_pair(
                                "END_BLOCK".to_string(),
                                incoming_block.to_string(),
                            ),
                            create_key_value_pair(
                                "LOG_FETCHER_LAMBDA_ARN".to_string(),
                                env::var("LOG_FETCHER_LAMBDA_ARN").unwrap(),
                            ),
                            create_key_value_pair(
                                "TRANSACTION_QUEUE_URL".to_string(),
                                env::var("TRANSACTION_QUEUE_URL").unwrap(),
                            ),
                            create_key_value_pair(
                                "NODE_ENDPOINT".to_string(),
                                env::var("NODE_ENDPOINT").unwrap(),
                            ),
                            create_key_value_pair(
                                "HANDLER_ID".to_string(),
                                env::var("HANDLER_ID").unwrap(),
                            ),
                            create_key_value_pair("VERSION".to_string(), version),
                        ]))
                        .build(),
                )
                .build(),
        )
        .send()
        .await;
    println!("done");

    match result {
        Err(e) => {
            println!("{:?}", e);
            pipeline
                .update()
                .set_state(ingest::types::pipeline::SyncState::IDLE)
                .send()
                .unwrap()
        }
        _ => {}
    }

    Ok(())
}

fn create_key_value_pair(name: String, value: String) -> KeyValuePair {
    KeyValuePair::builder()
        .set_name(Some(name))
        .set_value(Some(value))
        .build()
}
