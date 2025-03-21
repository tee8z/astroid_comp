use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use log::info;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{map_error, nostr_extractor::NostrAuth, startup::AppState};

use super::store::GameConfigResponse;

#[derive(Debug, Deserialize)]
pub struct ConfigQuery {
    pub session_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct NewSessionResponse {
    pub config: GameConfigResponse,
}

#[derive(Debug, Deserialize)]
pub struct ScoreSubmission {
    pub score: i64,
    pub level: i64,
    pub play_time: i64,
    pub session_id: String,
}

#[derive(Debug, Serialize)]
pub struct ScoreResponse {
    pub id: i64,
    pub score: i64,
    pub level: i64,
    pub play_time: i64,
    pub created_at: String,
}

// Health check endpoint
pub async fn health() -> impl IntoResponse {
    "OK"
}

// Create a new game session or get config for existing session
pub async fn get_game_config(
    auth: NostrAuth,
    Query(query): Query<ConfigQuery>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, Response> {
    let pubkey = auth.pubkey.to_string();
    info!("Game config request from pubkey: {}", pubkey);

    // Find or create user
    let user = match state.user_store.find_by_pubkey(pubkey.clone()).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return Err((StatusCode::NOT_FOUND, "User not found").into_response());
        }
        Err(e) => return Err(map_error(e)),
    };

    // Use existing session or create new one
    if let Some(session_id) = query.session_id {
        // Update existing session
        match state.game_store.update_session_activity(&session_id).await {
            Ok(session) => {
                if session.user_id != user.id {
                    return Err(
                        (StatusCode::FORBIDDEN, "Session belongs to a different user")
                            .into_response(),
                    );
                }

                // Get config for this session
                match state.game_store.create_game_config(&session).await {
                    Ok(config) => Ok((StatusCode::OK, Json(config))),
                    Err(e) => Err(map_error(e)),
                }
            }
            Err(e) => Err(map_error(e)),
        }
    } else {
        // Create a new session
        match state.game_store.create_session(user.id).await {
            Ok(session) => match state.game_store.create_game_config(&session).await {
                Ok(config) => Ok((StatusCode::OK, Json(config))),
                Err(e) => Err(map_error(e)),
            },
            Err(e) => Err(map_error(e)),
        }
    }
}

// Create a new game session
pub async fn start_new_session(
    auth: NostrAuth,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, Response> {
    let pubkey = auth.pubkey.to_string();
    info!("New session request from pubkey: {}", pubkey);

    // Find user
    let user = match state.user_store.find_by_pubkey(pubkey).await {
        Ok(Some(user)) => user,
        Ok(None) => return Err((StatusCode::UNAUTHORIZED, "User not found").into_response()),
        Err(e) => return Err(map_error(e)),
    };

    // Create a new session
    match state.game_store.create_session(user.id).await {
        Ok(session) => match state.game_store.create_game_config(&session).await {
            Ok(config) => Ok((StatusCode::CREATED, Json(NewSessionResponse { config }))),
            Err(e) => Err(map_error(e)),
        },
        Err(e) => Err(map_error(e)),
    }
}

// Submit a score
pub async fn submit_score(
    auth: NostrAuth,
    State(state): State<Arc<AppState>>,
    Json(submission): Json<ScoreSubmission>,
) -> Result<impl IntoResponse, Response> {
    let pubkey = auth.pubkey.to_string();
    info!("Score submission from pubkey: {}", pubkey);

    // Find user
    let user = match state.user_store.find_by_pubkey(pubkey).await {
        Ok(Some(user)) => user,
        Ok(None) => return Err((StatusCode::UNAUTHORIZED, "User not found").into_response()),
        Err(e) => return Err(map_error(e)),
    };

    // Debug log the session ID we're looking for
    info!("Looking for session ID: {}", submission.session_id);

    // Verify session
    match state.game_store.find_session(&submission.session_id).await {
        Ok(Some(session)) => {
            if session.user_id != user.id {
                return Err(
                    (StatusCode::FORBIDDEN, "Session belongs to a different user").into_response(),
                );
            }

            // Submit the score
            match state
                .game_store
                .submit_score(
                    user.id,
                    submission.score,
                    submission.level,
                    submission.play_time,
                )
                .await
            {
                Ok(score) => {
                    let response = ScoreResponse {
                        id: score.id,
                        score: score.score,
                        level: score.level,
                        play_time: score.play_time,
                        created_at: score.created_at,
                    };
                    Ok((StatusCode::CREATED, Json(response)))
                }
                Err(e) => Err(map_error(e)),
            }
        }
        Ok(None) => {
            info!("Session not found: {}", submission.session_id);
            Err((StatusCode::NOT_FOUND, "Session not found").into_response())
        }
        Err(e) => Err(map_error(e)),
    }
}

// Get top scores
pub async fn get_top_scores(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, Response> {
    info!("Get top scores request");

    match state.game_store.get_top_scores(10).await {
        Ok(scores) => Ok((StatusCode::OK, Json(scores))),
        Err(e) => Err(map_error(e)),
    }
}

// Get user scores
pub async fn get_user_scores(
    auth: NostrAuth,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, Response> {
    let pubkey = auth.pubkey.to_string();
    info!("Get user scores request from pubkey: {}", pubkey);

    // Find user
    let user = match state.user_store.find_by_pubkey(pubkey).await {
        Ok(Some(user)) => user,
        Ok(None) => return Err((StatusCode::UNAUTHORIZED, "User not found").into_response()),
        Err(e) => return Err(map_error(e)),
    };

    // Get scores
    match state.game_store.get_user_scores(user.id, 10).await {
        Ok(scores) => {
            let response: Vec<ScoreResponse> = scores
                .into_iter()
                .map(|score| ScoreResponse {
                    id: score.id,
                    score: score.score,
                    level: score.level,
                    play_time: score.play_time,
                    created_at: score.created_at,
                })
                .collect();

            Ok((StatusCode::OK, Json(response)))
        }
        Err(e) => Err(map_error(e)),
    }
}
