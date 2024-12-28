use crate::config::HandlerServerConfig;
use axum::{
    routing::{get, post},
    Router,
};
use lambda_extension::{service_fn, tracing, Error, LambdaEvent, NextEvent};
use sentry::protocol::Context;
use shared::{
    configuration::SharedConfig,
    processing,
    redis_client::RedisClientImpl,
    reporting_sdk::{ReportingSdk, SQSReportingSdk},
};
use std::collections::BTreeMap;
use std::{env, sync::Arc};
use tokio::sync::Mutex;
use tower_http::trace::TraceLayer;

pub fn init_sentry(handler_server_config: &HandlerServerConfig) -> sentry::ClientInitGuard {
    let options = sentry::ClientOptions {
        release: sentry::release_name!(),
        ..Default::default()
    };

    let _guard = sentry::init(("https://c749dc7d2929977538ed3abbd4fbdb4a@o4507692210454528.ingest.de.sentry.io/4507692217729104", options));

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
