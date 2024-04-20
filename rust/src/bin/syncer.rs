use aws_config::BehaviorVersion;
use aws_sdk_lambda::{operation::invoke::InvokeError, types::InvocationType};
use aws_sdk_s3::{error::SdkError, primitives::Blob};
use futures::{future::join_all, TryFutureExt};
use ingest::{
    log_fetcher::invocation::InvocationResponse,
    proto::{IngestPayload, IngestTransaction},
    syncer,
};
use prost::bytes::BytesMut;
use serde::Serialize;
use std::{io::Read, time::Duration};
use uuid::Uuid;

#[derive(Serialize, Debug)]
struct BlockConfig {
    id: u64,
    start_block: u64,
    end_block: u64,
    previous_id: Option<u64>,
}

const BATCH_SIZE: u64 = 1999;

#[tokio::main]
async fn main() -> Result<(), SdkError<InvokeError>> {
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let lambda_client = aws_sdk_lambda::Client::new(&config);
    let s3_client = aws_sdk_s3::Client::new(&config);
    let sqs_client = aws_sdk_sqs::Client::new(&config);
    let syncer_config = syncer::load_config_from_env();

    let batches = get_batches(syncer_config.start_block, syncer_config.end_block);

    let mut invocations = Vec::new();

    for batch in batches.chunks(100) {
        let mut lambda_invocation_futures = Vec::new();

        for config in batch {
            lambda_invocation_futures.push(
                lambda_client
                    .invoke()
                    .invocation_type(InvocationType::RequestResponse)
                    .function_name(&syncer_config.function_name)
                    .payload(Blob::new(serde_json::to_vec(config).unwrap()))
                    .send(),
            );
        }

        let lambda_results = join_all(lambda_invocation_futures).await;
        invocations.extend(lambda_results);

        tokio::time::sleep(Duration::from_secs(2)).await;
    }

    println!("Invocations Length: {:?}", invocations.len());

    let mut s3_results = Vec::new();
    for invocation_chunk in invocations.chunks(400) {
        let mut s3_result_futures = Vec::new();

        for invocation in invocation_chunk {
            let output = match invocation {
                Ok(v) => v.to_owned(),
                Err(e) => panic!("Invocation Error: {e}"),
            };

            let payload = match output.payload {
                Some(v) => v.into_inner(),
                None => panic!("Blob is empty"),
            };

            let response: InvocationResponse = serde_json::from_slice(&payload).unwrap();
            if response.s3_bucket.is_none() || response.s3_prefix.is_none() {
                continue;
            }

            s3_result_futures.push(
                s3_client
                    .get_object()
                    .bucket(response.s3_bucket.unwrap())
                    .key(response.s3_prefix.unwrap())
                    .send()
                    .and_then(|r| async move {
                        let body = r.body.collect().await.unwrap();

                        let data: IngestPayload =
                            prost::Message::decode(body.into_bytes().to_vec().as_slice()).unwrap();
                        Ok(data)
                    }),
            )
        }

        let results = join_all(s3_result_futures)
            .await
            .into_iter()
            .map(|f| f.unwrap().transactions)
            .flatten()
            .collect::<Vec<IngestTransaction>>();

        s3_results.extend(results);
    }

    println!("S3 Results: {:?}", s3_results.len());

    let mut i = 0;
    while i < s3_results.len() {
        // Batch is a list of a list of max 256 kb txs
        let mut batch = Vec::new();

        while batch.len() < 10 && i < s3_results.len() {
            let mut group_size = 0;
            let mut group = Vec::new();
            let mut last_id: Option<&str> = None;

            // Group each entry into max 256kb entries.
            while i < s3_results.len() {
                let last_seen_tx = &s3_results[i];

                // if last id is none, make it current tx
                if last_id.is_none() {
                    last_id = Some(last_seen_tx.id.as_str());
                }

                // if last id is not current id (different tx types), break
                if last_id.unwrap().ne(last_seen_tx.id.as_str()) {
                    break;
                }

                let tx_buffer = &mut BytesMut::new();
                prost::Message::encode(last_seen_tx, tx_buffer);

                // check that tx size will not make this entry over 256kb
                let tx_size = tx_buffer.len();
                if tx_size + group_size > 250000 {
                    break;
                }

                // add tx size to group size and add tx to group
                group_size += tx_size;
                group.push(last_seen_tx.clone());

                // next result
                i += 1;
            }

            // group is an entry
            batch.push(group);
        }

        println!("Txs length {:?}", batch.len());

        for txs in batch.into_iter() {
            upload_to_sqs(&sqs_client, &syncer_config, txs).await;
        }
    }

    Ok(())
}

fn get_batches(mut start_block: u64, end_block: u64) -> Vec<BlockConfig> {
    let mut result: Vec<BlockConfig> = Vec::new();
    let mut previous_id: Option<u64> = None;
    while start_block + BATCH_SIZE < end_block {
        let id = previous_id.map(|p| p + 1).or(Some(1)).unwrap();
        result.push(BlockConfig {
            id,
            start_block,
            end_block: start_block + BATCH_SIZE,
            previous_id,
        });
        previous_id = Some(id);
        start_block += BATCH_SIZE + 1;
    }

    if end_block - start_block > 0 {
        let id = previous_id.map(|p| p + 1).or(Some(1)).unwrap();

        result.push(BlockConfig {
            id,
            start_block,
            end_block,
            previous_id,
        });
    }

    return result;
}

async fn upload_to_sqs(
    sqs_client: &aws_sdk_sqs::Client,
    syncer_config: &syncer::Config,
    txs: Vec<IngestTransaction>,
) {
    let id = Uuid::new_v4();

    let buffer = &mut BytesMut::new();

    prost::Message::encode(
        &IngestPayload {
            transactions: txs.clone(),
        },
        buffer,
    )
    .unwrap();

    let sqs_res = sqs_client
        .send_message()
        .queue_url(&syncer_config.tx_queue_url)
        .message_body(
            String::from_utf8(buffer.bytes().map(|b| b.unwrap()).collect::<Vec<u8>>()).unwrap(),
        )
        .message_group_id("main")
        .message_deduplication_id(id)
        .send()
        .await;

    match sqs_res {
        Ok(_) => {}
        Err(e) => panic!("Upload Result: {:?}", e),
    }
}
