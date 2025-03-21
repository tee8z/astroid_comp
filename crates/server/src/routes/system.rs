use axum::{extract::State, response::ErrorResponse};
use hyper::StatusCode;
use log::{debug, error};
use std::sync::Arc;

use crate::{domain::map_error, AppState};

pub async fn health_check(State(state): State<Arc<AppState>>) -> Result<StatusCode, ErrorResponse> {
    state.user_store.ping().await.map_err(|e| {
        error!("{}", e);
        map_error(e)
    })?;

    state.game_store.ping().await.map_err(|e| {
        error!("{}", e);
        map_error(e)
    })?;

    debug!("service and db are up");
    Ok(StatusCode::OK)
}
