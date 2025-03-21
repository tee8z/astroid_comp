use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{map_error, nostr_extractor::NostrAuth, startup::AppState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterPayload {
    pub username: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub session_id: String,
    pub username: String,
    pub pubkey: String,
}

pub async fn login(
    auth: NostrAuth,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, Response> {
    let pubkey = auth.pubkey.to_string();
    info!("Login request from pubkey: {}", pubkey);

    match state.user_store.login(pubkey).await {
        Ok(user_info) => {
            let response = LoginResponse {
                session_id: user_info.session_id,
                username: user_info.username,
                pubkey: user_info.pubkey,
            };
            Ok((StatusCode::OK, Json(response)))
        }
        Err(e) => {
            error!("Login error: {}", e);
            Err(map_error(e))
        }
    }
}

pub async fn register(
    auth: NostrAuth,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterPayload>,
) -> Result<impl IntoResponse, Response> {
    let pubkey = auth.pubkey.to_string();
    info!("Register request from pubkey: {}", pubkey);

    match state.user_store.register(pubkey, payload).await {
        Ok(user_info) => {
            let response = LoginResponse {
                session_id: user_info.session_id,
                username: user_info.username,
                pubkey: user_info.pubkey,
            };
            Ok((StatusCode::CREATED, Json(response)))
        }
        Err(e) => {
            error!("Registration error: {}", e);
            Err(map_error(e))
        }
    }
}
