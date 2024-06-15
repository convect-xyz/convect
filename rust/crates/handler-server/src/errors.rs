use aws_sdk_sqs::error::BoxError;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

pub enum ServerError {
    BoxError(BoxError),
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
        };

        (status, axum::Json(ErrorResponse { message })).into_response()
    }
}

impl From<BoxError> for ServerError {
    fn from(error: BoxError) -> Self {
        Self::BoxError(error)
    }
}
