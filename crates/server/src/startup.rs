use anyhow::anyhow;
use axum::{
    body::Body,
    extract::{connect_info::IntoMakeServiceWithConnectInfo, ConnectInfo, Request},
    http::Extensions,
    middleware::{self, AddExtension, Next},
    response::IntoResponse,
    routing::get,
    serve::Serve,
    Router,
};
use hyper::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    Method,
};
use log::{error, info, warn};
use reqwest_middleware::{
    reqwest::{self, Client, Response},
    ClientBuilder, ClientWithMiddleware, Middleware,
};
use reqwest_retry::{policies::ExponentialBackoff, RetryTransientMiddleware};
use std::sync::Arc;
use std::{net::SocketAddr, str::FromStr};
use tokio::signal::unix::{signal, SignalKind};
use tokio::{net::TcpListener, select};
use tower_http::{
    cors::{Any, CorsLayer},
    services::{ServeDir, ServeFile},
};

use crate::{config::Settings, file_utils::create_folder, index_handler};
pub struct Application {
    server: Serve<
        TcpListener,
        IntoMakeServiceWithConnectInfo<Router, SocketAddr>,
        AddExtension<Router, ConnectInfo<SocketAddr>>,
    >,
}

impl Application {
    pub async fn build(config: Settings) -> Result<Self, anyhow::Error> {
        let address = format!(
            "{}:{}",
            config.api_settings.domain, config.api_settings.port
        );
        let listener = SocketAddr::from_str(&address)?;
        let (app_state, serve_dir) = build_app(config).await?;
        let server = build_server(listener, app_state, serve_dir).await?;
        Ok(Self { server })
    }

    pub async fn run_until_stopped(self) -> Result<(), anyhow::Error> {
        info!("Starting server...");
        match self.server.with_graceful_shutdown(shutdown_signal()).await {
            Ok(_) => {
                info!("Shutdown complete");
                Ok(())
            }
            Err(e) => {
                error!("Server shutdown error: {}", e);
                Err(anyhow!("Error during server shutdown: {}", e))
            }
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub ui_dir: String,
    pub remote_url: String,
}

pub async fn build_app(config: Settings) -> Result<(AppState, ServeDir<ServeFile>), anyhow::Error> {
    // The ui folder needs to be generated and have this relative path from where the binary is being run
    let serve_dir = ServeDir::new(config.ui_settings.ui_dir.clone())
        .not_found_service(ServeFile::new(format!(
            "{}/index.html",
            config.ui_settings.ui_dir
        )))
        .fallback(ServeFile::new(format!(
            "{}/index.html",
            config.ui_settings.ui_dir
        )));
    info!("Public UI configured");

    create_folder(&config.db_settings.data_folder.clone());

    let app_state = AppState {
        ui_dir: config.ui_settings.ui_dir,
        remote_url: config.ui_settings.remote_url,
    };
    Ok((app_state, serve_dir))
}

pub async fn build_server(
    socket_addr: SocketAddr,
    app_state: AppState,
    serve_dir: ServeDir<ServeFile>,
) -> Result<
    Serve<
        TcpListener,
        IntoMakeServiceWithConnectInfo<Router, SocketAddr>,
        AddExtension<Router, ConnectInfo<SocketAddr>>,
    >,
    anyhow::Error,
> {
    let std_listener = std::net::TcpListener::bind(socket_addr)?;
    let listener = TcpListener::from_std(std_listener)?;

    info!("Setting up service");
    let app = app(app_state, serve_dir);
    let server = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    );
    info!(
        "Service running @: http://{}:{}",
        socket_addr.ip(),
        socket_addr.port()
    );
    Ok(server)
}

pub fn app(app_state: AppState, serve_dir: ServeDir<ServeFile>) -> Router {
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([ACCEPT, CONTENT_TYPE, AUTHORIZATION])
        .allow_origin(Any);

    /*let users_endpoints = Router::new()
    .route("/login", post(login))
    .route("/register", post(register));*/

    Router::new()
        .route("/", get(index_handler))
        .fallback(index_handler)
        //.route("/api/v1/health_check", get(health))
        //.nest("/api/v1/users", users_endpoints)
        .layer(middleware::from_fn(log_request))
        .with_state(Arc::new(app_state))
        .nest_service("/ui", serve_dir.clone())
        .layer(cors)
}

async fn log_request(request: Request<Body>, next: Next) -> impl IntoResponse {
    let now = time::OffsetDateTime::now_utc();
    let path = request
        .uri()
        .path_and_query()
        .map(|p| p.as_str())
        .unwrap_or_default();
    info!(target: "http_request","new request, {} {}", request.method().as_str(), path);

    let response = next.run(request).await;
    let response_time = time::OffsetDateTime::now_utc() - now;
    info!(target: "http_response", "response, code: {}, time: {}", response.status().as_str(), response_time);

    response
}

pub fn build_reqwest_client() -> ClientWithMiddleware {
    let retry_policy = ExponentialBackoff::builder().build_with_max_retries(3);
    ClientBuilder::new(Client::new())
        .with(LoggingMiddleware)
        .with(RetryTransientMiddleware::new_with_policy(retry_policy))
        .build()
}

struct LoggingMiddleware;

#[async_trait::async_trait]
impl Middleware for LoggingMiddleware {
    async fn handle(
        &self,
        req: reqwest::Request,
        extensions: &mut Extensions,
        next: reqwest_middleware::Next<'_>,
    ) -> reqwest_middleware::Result<Response> {
        let method = req.method().clone();
        let url = req.url().clone();

        info!("Making {} request to: {}", method, url);

        let result = next.run(req, extensions).await;

        match &result {
            Ok(response) => {
                info!("{} {} -> Status: {}", method, url, response.status());
            }
            Err(error) => {
                warn!("{} {} -> Error: {:?}", method, url, error);
            }
        }

        result
    }
}

async fn shutdown_signal() {
    let mut sigint = signal(SignalKind::interrupt()).expect("Failed to install SIGINT handler");
    let mut sigterm = signal(SignalKind::terminate()).expect("Failed to install SIGTERM handler");

    select! {
        _ = sigint.recv() => info!("Received SIGINT signal"),
        _ = sigterm.recv() => info!("Received SIGTERM signal"),
    }
}
