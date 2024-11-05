use axum::BoxError;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

use shared::reporting_sdk::errors::ReportingSdkError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ServerError {
    #[error("Box error")]
    BoxError(#[from] BoxError),
    #[error("Reporting SDK error")]
    ReportingSdkError(#[from] ReportingSdkError),
}

impl IntoResponse for ServerError {
    fn into_response(self) -> Response {
        #[derive(Serialize)]
        struct ErrorResponse {
            message: String,
        }

        let (status, message) = match self {
            ServerError::BoxError(e) => {
                // tracing::error!(%err, "box error");
                println!("{:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, format!("{:?}", e))
            }
            ServerError::ReportingSdkError(e) => {
                // tracing::error!(%err, "s3 error");
                (StatusCode::INTERNAL_SERVER_ERROR, format!("{:?}", e))
            }
        };

        (status, axum::Json(ErrorResponse { message })).into_response()
    }
}
