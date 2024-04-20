use std::env;

use aws_lambda_events::event::sns::SnsEvent;
use aws_sdk_ecs::types::{
    AwsVpcConfiguration, ContainerOverride, KeyValuePair, NetworkConfiguration, TaskOverride,
};
use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};

fn create_key_value_pair(name: String, value: String) -> KeyValuePair {
    KeyValuePair::builder()
        .set_name(Some(name))
        .set_value(Some(value))
        .build()
}
async fn function_handler(event: LambdaEvent<SnsEvent>) -> Result<(), Error> {
    let config = aws_config::load_from_env().await;
    let ecs_client = aws_sdk_ecs::Client::new(&config);

    let message = &event.payload.records.last().unwrap().sns.message;

    let res = ecs_client
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
                            create_key_value_pair("START_BLOCK".to_string(), "0".to_string()),
                            create_key_value_pair("END_BLOCK".to_string(), message.clone()),
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
                        ]))
                        .build(),
                )
                .build(),
        )
        .send()
        .await;

    println!("Response: {:?}", res);

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
