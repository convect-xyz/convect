use aws_config::BehaviorVersion;
use futures::future::join_all;
use issue_notifier::IssueNotifierImpl;
use listener::Listener;
use producer::{ProducerModule, ProducerModuleImpl};
use shared::networks::get_supported_networks;
use shared::resend::ResendClientImpl;
use tokio_retry::strategy::jitter;
use tokio_retry::Retry;
use tracing::level_filters::LevelFilter;
use tracing::Level;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{EnvFilter, Layer};

mod issue_notifier;
mod listener;
mod producer;

fn init_sentry() -> sentry::ClientInitGuard {
    sentry::init(("https://c5cededbadf03d6bc62ef318828f6c17@o4507692210454528.ingest.de.sentry.io/4507870803525712", sentry::ClientOptions {
    release: Some(std::borrow::Cow::Owned("producer".to_string())),
    traces_sample_rate: 0.6,
    ..Default::default()
  }))
}

fn init_tracing() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_ansi(false)
                .with_target(false)
                .without_time()
                .with_filter(
                    EnvFilter::builder()
                        .with_default_directive(LevelFilter::from_level(Level::INFO).into())
                        .from_env_lossy(),
                ),
        )
        .with(sentry_tracing::layer())
        .init();
}

#[tokio::main(flavor = "multi_thread", worker_threads = 10)]
async fn main() {
    let _guard = init_sentry();
    init_tracing();

    let producer_modules: Vec<_> = get_supported_networks()
        .await
        .into_iter()
        .map(|network| ProducerModuleImpl::new(network))
        .collect();

    let producer_task_handles: Vec<_> = producer_modules
        .iter()
        .map(|module| {
            let retry_strategy = tokio_retry::strategy::ExponentialBackoff::from_millis(15)
                .map(jitter)
                .take(usize::MAX);

            let func = move || async move {
                let module = module.clone();
                let name = module.network().name.clone();
                tokio::spawn(async move {
                    module.produce_async().await?;
                    Ok::<(), producer::errors::ProducerError>(())
                })
                .await
                .inspect_err(|e| {
                    tracing::error!("[{:?}] Producer task failed: {:?}", &name, e);
                })?
                .inspect_err(|e| {
                    tracing::error!("[{:?}] Producer task failed #2: {:?}", &name, e);
                })?;

                Ok::<(), producer::errors::ProducerError>(())
            };

            Retry::spawn(retry_strategy, func)
        })
        .collect();

    let listener = listener::ListenerImpl::new(
        producer_modules
            .iter()
            .map(|m| Box::new(m.clone()) as Box<dyn ProducerModule>)
            .collect(),
        IssueNotifierImpl::new(ResendClientImpl::new(
            "REDACTED",
        )),
        aws_sdk_sns::Client::new(&aws_config::load_defaults(BehaviorVersion::latest()).await),
    );
    let listener_handle = tokio::spawn(async move { listener.listen().await.unwrap() });

    for handle in join_all(producer_task_handles).await.into_iter() {
        match handle {
            Ok(_) => tracing::info!("Handler finished"),
            Err(e) => tracing::error!("Handler failed: {:?}", e),
        }
    }

    listener_handle.await.unwrap();
}
