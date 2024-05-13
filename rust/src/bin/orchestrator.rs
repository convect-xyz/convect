use std::{env, fmt::format};

use aws_lambda_events::event::sns::SnsEvent;
use aws_sdk_ecs::types::{
    AwsVpcConfiguration, ContainerOverride, KeyValuePair, NetworkConfiguration, TaskOverride,
};
use futures::TryFutureExt;
use ingest::{api, manifest::Manifest, syncer::Pipeline};
use lambda_runtime::{run, service_fn, tower::BoxError, tracing, Error, LambdaEvent};

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}

async fn function_handler(event: LambdaEvent<SnsEvent>) -> Result<(), Error> {
    let config = aws_config::load_from_env().await;
    let sqs_client = aws_sdk_sqs::Client::new(&config);
    let ecs_client = aws_sdk_ecs::Client::new(&config);

    let handler_id = env::var("HANDLER_ID").expect("Handler ID not set");
    let pipeline = Pipeline::load(handler_id).await;
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
    if pipeline.state().ne(&ingest::syncer::SyncState::IDLE) {
        return Ok(());
    }

    // It is the responsibility of the ECS task to revert this status
    pipeline
        .update()
        .set_state(ingest::syncer::SyncState::SYNCING)
        .send()
        .await
        .expect("Failed to update pipeline");

    // If block diff is too great, trigger fargate to do the work
    if incoming_block - pipeline.last_block().or(Some(0)).unwrap() > 1999 {
        return trigger_batch_sync_task(&ecs_client, &pipeline, incoming_block).await;
    }

    // We'll process the blocks here and add them to tx queue
    // We shouldn't need to update status here because max concurrency should be 1
    return sync_blocks(
        &sqs_client,
        pipeline.last_block().map(|l| l + 1).or(Some(0)).unwrap(),
        incoming_block,
    )
    .and_then(|_| async {
        pipeline
            .update()
            .set_last_block(incoming_block)
            .set_state(ingest::syncer::SyncState::IDLE)
            .send()
            .await
    })
    .await;
}

async fn trigger_batch_sync_task(
    ecs_client: &aws_sdk_ecs::Client,
    pipeline: &Pipeline,
    incoming_block: u64,
) -> Result<(), Error> {
    let version = env::var("VERSION").expect("Version ENV not defined");

    println!(
        "arn:aws:ecs:eu-west-1:730335604495:task-definition/syncer-{:?}",
        version.replace(".", "-")
    );
    ecs_client
        .run_task()
        .cluster("arn:aws:ecs:eu-west-1:730335604495:cluster/syncers")
        .task_definition(format!(
            "arn:aws:ecs:eu-west-1:730335604495:task-definition/syncer-{:?}",
            version.replace(".", "-")
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
                            create_key_value_pair(
                                "PROJECT_ID".to_string(),
                                env::var("PROJECT_ID").unwrap(),
                            ),
                            create_key_value_pair("VERSION".to_string(), version),
                        ]))
                        .build(),
                )
                .build(),
        )
        .send()
        .await
        .unwrap();

    Ok(())
}

fn create_key_value_pair(name: String, value: String) -> KeyValuePair {
    KeyValuePair::builder()
        .set_name(Some(name))
        .set_value(Some(value))
        .build()
}

async fn sync_blocks(
    sqs_client: &aws_sdk_sqs::Client,
    from_block: u64,
    to_block: u64,
) -> Result<(), BoxError> {
    let manifest = Manifest::from_env().await.unwrap();

    let transactions = api::get_ingest_transactions(&manifest, from_block, to_block)
        .await
        .unwrap();

    api::upload_to_sqs(
        sqs_client,
        env::var("TRANSACTION_QUEUE_URL").expect("Tx Queue URL not set"),
        api::SQSPayload::Transactions(transactions),
    )
    .await;

    Ok(())
}
