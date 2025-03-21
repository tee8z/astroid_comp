use std::sync::Arc;

use axum::{extract::State, response::Html};
use log::info;
use tokio::fs;

use crate::startup::AppState;

pub async fn index_handler(State(state): State<Arc<AppState>>) -> Html<String> {
    Html(public_index(&state.remote_url, &state.ui_dir).await)
}

pub async fn public_index(remote_url: &str, ui_dir: &str) -> String {
    let file_content = fs::read_to_string(&format!("{}/index.html", ui_dir))
        .await
        .expect("Unable to read index.html");
    info!("remote_url: {}", remote_url);
    file_content.replace("{SERVER_ADDRESS}", remote_url)
}
