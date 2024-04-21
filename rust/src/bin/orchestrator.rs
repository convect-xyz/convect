use std::env;

use aws_config::SdkConfig;
use aws_lambda_events::event::sns::SnsEvent;
use aws_sdk_ecs::types::{
    AwsVpcConfiguration, ContainerOverride, KeyValuePair, NetworkConfiguration, TaskOverride,
};
use ingest::syncer::Pipeline;
use lambda_runtime::{run, service_fn, tower::BoxError, tracing, Error, LambdaEvent};

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}

async fn function_handler(event: LambdaEvent<SnsEvent>) -> Result<(), Error> {
    let config = aws_config::load_from_env().await;
    let pipeline_id = env::var("PIPELINE_ID").expect("Pipeline ID not set");
    let pipeline = Pipeline::load(pipeline_id).await;
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
    if pipeline.state.ne(&ingest::syncer::SyncState::IDLE) {
        return Ok(());
    }

    // If block diff is too great, trigger fargate to do the work
    if incoming_block - pipeline.last_block > 1999 {
        return trigger_batch_sync(&pipeline, &config, incoming_block).await;
    }

    // We'll process the blocks here and add them to tx queue
    // We shouldn't need to update status here because max concurrency should be 1
    return sync_blocks().await;
}

async fn trigger_batch_sync(
    pipeline: &Pipeline,
    config: &SdkConfig,
    incoming_block: u64,
) -> Result<(), Error> {
    let ecs_client = aws_sdk_ecs::Client::new(&config);

    // It is the responsibility of the ECS task to revert this status
    pipeline
        .update()
        .set_state(ingest::syncer::SyncState::SYNCING)
        .send()
        .await
        .expect("Failed to update pipeline");

    let _ = ecs_client
        .run_task()
        .cluster("arn:aws:ecs:eu-west-1:730335604495:cluster/syncers")
        .task_definition("arn:aws:ecs:eu-west-1:730335604495:task-definition/syncers:1")
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
                                (pipeline.last_block + 1).to_string(),
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
                                "PIPELINE_ID".to_string(),
                                env::var("PIPELINE_ID").unwrap(),
                            ),
                        ]))
                        .build(),
                )
                .build(),
        )
        .send()
        .await;

    Ok(())
}

fn create_key_value_pair(name: String, value: String) -> KeyValuePair {
    KeyValuePair::builder()
        .set_name(Some(name))
        .set_value(Some(value))
        .build()
}

async fn sync_blocks() -> Result<(), BoxError> {
    Ok(())
}
