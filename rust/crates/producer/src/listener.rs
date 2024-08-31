use chrono::Utc;
use shared::sns::Sns;
use std::{collections::HashMap, sync::Arc};
use tokio::{task::JoinHandle, time};

use crate::{
    issue_notifier::{IssueNotifier, ProducerModuleIssue},
    producer::ProducerModule,
};

const PRODUCER_SNS_TOPIC: &str = "arn:aws:sns:eu-west-1:730335604495:all-chains";

pub trait Listener {
    fn spawn(&self) -> JoinHandle<()>;
}

pub struct ListenerImpl<N: IssueNotifier + 'static, S: Sns + 'static> {
    producer_modules: Vec<Arc<dyn ProducerModule>>,
    notifier: Arc<N>,
    sns_client: Arc<S>,
}

impl<N: IssueNotifier + 'static, S: Sns + 'static> ListenerImpl<N, S> {
    pub fn new(producer_modules: Vec<Arc<dyn ProducerModule>>, notifier: N, sns_client: S) -> Self {
        Self {
            producer_modules,
            notifier: Arc::new(notifier),
            sns_client: Arc::new(sns_client),
        }
    }
}

impl<N: IssueNotifier + 'static, S: Sns + 'static> Listener for ListenerImpl<N, S> {
    fn spawn(&self) -> JoinHandle<()> {
        let producer_modules = self.producer_modules.clone();
        let sns_client = self.sns_client.clone();
        let notifier = self.notifier.clone();

        tokio::spawn(async move {
            let mut interval: time::Interval = time::interval(time::Duration::from_secs(3));

            loop {
                interval.tick().await;

                let mut current_blocks = HashMap::new();
                for module in producer_modules.iter() {
                    let network = module.network();
                    let (current_block, last_updated_at) = module.get_current().await;
                    if let Some(current_block) = current_block {
                        current_blocks.insert(network.id, current_block);
                    }

                    let now = Utc::now();

                    if let Some(last_updated_at) = last_updated_at {
                        // If last updated at is more than 60 seconds ago, send an email
                        if now.timestamp() - last_updated_at.timestamp() > 60 {
                            let _ = notifier
                                .notify_producer_module_issue(ProducerModuleIssue::BlockNotChanged(
                                    network.clone(),
                                    current_block,
                                    last_updated_at,
                                ))
                                .await;
                        }
                    }

                    if last_updated_at.is_none() {
                        let _ = notifier
                            .notify_producer_module_issue(ProducerModuleIssue::NoCurrentBlock(
                                network.clone(),
                            ))
                            .await;
                    }
                }

                tracing::info!("Current Blocks: {:?}", current_blocks);
                sns_client
                    .publish(
                        PRODUCER_SNS_TOPIC,
                        &serde_json::to_string(&current_blocks).unwrap(),
                    )
                    .await
                    .unwrap();
            }
        })
    }
}
