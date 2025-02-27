use crate::config::HandlerServerConfig;
use sentry::protocol::Context;
use std::collections::BTreeMap;

pub fn init_sentry(handler_server_config: &HandlerServerConfig) -> sentry::ClientInitGuard {
    let options = sentry::ClientOptions {
        release: sentry::release_name!(),
        ..Default::default()
    };

    let _guard = sentry::init(("https://b6a72df3ab24772f73a358f4de687797@o4507692210454528.ingest.de.sentry.io/4508655667707984", options));

    sentry::configure_scope(|scope| {
        scope.set_user(Some(sentry::User {
            id: Some(handler_server_config.project_id.to_string()),
            ..Default::default()
        }));

        let mut deployment_map = BTreeMap::new();
        deployment_map.insert(
            "deployment_id".to_string(),
            handler_server_config.deployment_id.clone().into(),
        );
        deployment_map.insert(
            "function_id".to_string(),
            handler_server_config.function_id.clone().into(),
        );

        scope.set_context("deployment", Context::Other(deployment_map));
    });

    _guard
}
