use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite};
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::domain::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameSession {
    pub id: i64,
    pub session_id: String,
    pub user_id: i64,
    pub start_time: String,
    pub last_active: String,
    pub difficulty_factor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameConfig {
    pub id: i64,
    pub config_id: String,
    pub user_id: i64,
    pub version: String,
    pub created_at: String,
    pub expiration_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Score {
    pub id: i64,
    pub user_id: i64,
    pub score: i64,
    pub level: i64,
    pub play_time: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreWithUsername {
    pub id: i64,
    pub username: String,
    pub score: i64,
    pub level: i64,
    pub play_time: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameConfigResponse {
    pub version: String,
    pub config_id: String,
    pub session_id: String,
    pub expiration_time: u64,
    pub fps: u64,
    pub ship: ShipConfig,
    pub bullets: BulletsConfig,
    pub asteroids: AsteroidsConfig,
    pub scoring: ScoringConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipConfig {
    pub radius: u64,
    pub turn_speed: f64,
    pub thrust: f64,
    pub friction: f64,
    pub invulnerability_time: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulletsConfig {
    pub speed: u64,
    pub radius: u64,
    pub max_count: u64,
    pub life_time: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AsteroidsConfig {
    pub initial_count: u64,
    pub speed: u64,
    pub size: u64,
    pub vertices: VerticesConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerticesConfig {
    pub min: u64,
    pub max: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoringConfig {
    pub points_per_asteroid: u64,
    pub level_multiplier: f64,
}

#[derive(Debug, Clone)]
pub struct GameStore {
    db: Pool<Sqlite>,
}

impl GameStore {
    pub fn new(db: Pool<Sqlite>) -> Self {
        Self { db }
    }

    pub async fn ping(&self) -> Result<(), Error> {
        sqlx::query!("SELECT 1 as ping").fetch_one(&self.db).await?;
        Ok(())
    }

    pub async fn create_session(&self, user_id: i64) -> Result<GameSession, Error> {
        let session_id = format!("session_{}", Uuid::now_v7());
        let now = OffsetDateTime::now_utc().to_string();

        let session_id_clone = session_id.clone();

        let id = sqlx::query!(
            r#"
            INSERT INTO game_sessions (session_id, user_id, start_time, last_active, difficulty_factor)
            VALUES (?, ?, ?, ?, ?)
            "#,
            session_id,
            user_id,
            now,
            now,
            1.0 // Initial difficulty
        )
        .execute(&self.db)
        .await?
        .last_insert_rowid();

        Ok(GameSession {
            id,
            session_id: session_id_clone,
            user_id,
            start_time: now.clone(),
            last_active: now,
            difficulty_factor: 1.0,
        })
    }

    pub async fn find_session(&self, session_id: &str) -> Result<Option<GameSession>, Error> {
        let session = sqlx::query_as!(
            GameSession,
            r#"
            SELECT id, session_id, user_id, start_time, last_active, difficulty_factor
            FROM game_sessions
            WHERE session_id = ?
            "#,
            session_id
        )
        .fetch_optional(&self.db)
        .await?;

        Ok(session)
    }

    pub async fn update_session_activity(&self, session_id: &str) -> Result<GameSession, Error> {
        let now = OffsetDateTime::now_utc().to_string();

        // Find the existing session
        let session = match self.find_session(session_id).await? {
            Some(s) => s,
            None => {
                return Err(Error::NotFound(format!(
                    "Session not found: {}",
                    session_id
                )))
            }
        };

        // Calculate how long the session has been active
        let start = OffsetDateTime::parse(
            &session.start_time,
            &time::format_description::well_known::Iso8601::DEFAULT,
        )
        .map_err(|_| {
            Error::InvalidInput("Invalid date format in session start time".to_string())
        })?;

        let current = OffsetDateTime::now_utc();
        let duration_minutes = (current - start).whole_minutes() as f64;

        // Calculate difficulty factor (10% increase per minute, max 3x)
        let difficulty = (1.0 + (duration_minutes * 0.1)).min(3.0);

        // Update the session
        sqlx::query!(
            r#"
            UPDATE game_sessions
            SET last_active = ?, difficulty_factor = ?
            WHERE session_id = ?
            "#,
            now,
            difficulty,
            session_id
        )
        .execute(&self.db)
        .await?;

        Ok(GameSession {
            id: session.id,
            session_id: session.session_id,
            user_id: session.user_id,
            start_time: session.start_time,
            last_active: now,
            difficulty_factor: difficulty,
        })
    }

    pub async fn create_game_config(
        &self,
        session: &GameSession,
    ) -> Result<GameConfigResponse, Error> {
        let config_id = format!("config_{}", Uuid::now_v7());
        let version = "1.0.0".to_string();
        let expiration_time = (OffsetDateTime::now_utc() + Duration::minutes(5)).to_string();
        let now = OffsetDateTime::now_utc().to_string();

        // Store config in database
        sqlx::query!(
            r#"
            INSERT INTO game_configs (config_id, user_id, version, created_at, expiration_time)
            VALUES (?, ?, ?, ?, ?)
            "#,
            config_id,
            session.user_id,
            version,
            now,
            expiration_time
        )
        .execute(&self.db)
        .await?;

        // Calculate expiration time in milliseconds
        let expiration_ms =
            (OffsetDateTime::now_utc() + Duration::minutes(5)).unix_timestamp() * 1000;

        // Apply difficulty factor from session
        let difficulty = session.difficulty_factor;

        // Return config with difficulty scaling
        Ok(GameConfigResponse {
            version,
            config_id,
            session_id: session.session_id.clone(),
            expiration_time: expiration_ms as u64,
            fps: 60,
            ship: ShipConfig {
                radius: 10,
                turn_speed: 0.1,
                thrust: 0.1,
                friction: 0.05,
                invulnerability_time: 3000,
            },
            bullets: BulletsConfig {
                speed: 5,
                radius: 2,
                max_count: 10,
                life_time: 60,
            },
            asteroids: AsteroidsConfig {
                // Scale asteroid count with difficulty
                initial_count: (5.0 * difficulty) as u64,
                // Scale asteroid speed with difficulty
                speed: (1.0 * difficulty) as u64,
                size: 30,
                vertices: VerticesConfig { min: 7, max: 15 },
            },
            scoring: ScoringConfig {
                // Make points worth more as difficulty increases
                points_per_asteroid: (10.0 * difficulty) as u64,
                level_multiplier: 1.5,
            },
        })
    }

    pub async fn submit_score(
        &self,
        user_id: i64,
        score: i64,
        level: i64,
        play_time: i64,
    ) -> Result<Score, Error> {
        let now = OffsetDateTime::now_utc().to_string();

        // Save the score
        let id = sqlx::query!(
            r#"
            INSERT INTO scores (user_id, score, level, play_time, created_at)
            VALUES (?, ?, ?, ?, ?)
            "#,
            user_id,
            score,
            level,
            play_time,
            now
        )
        .execute(&self.db)
        .await?
        .last_insert_rowid();

        Ok(Score {
            id,
            user_id,
            score,
            level,
            play_time,
            created_at: now,
        })
    }

    pub async fn get_top_scores(&self, limit: i64) -> Result<Vec<ScoreWithUsername>, Error> {
        let scores = sqlx::query!(
            r#"
            SELECT s.id, s.user_id, s.score, s.level, s.play_time, s.created_at, u.username
            FROM scores s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.score DESC
            LIMIT ?
            "#,
            limit
        )
        .fetch_all(&self.db)
        .await?
        .into_iter()
        .map(|row| ScoreWithUsername {
            id: row.id,
            username: row.username,
            score: row.score,
            level: row.level,
            play_time: row.play_time,
            created_at: row.created_at,
        })
        .collect();

        Ok(scores)
    }

    pub async fn get_user_scores(&self, user_id: i64, limit: i64) -> Result<Vec<Score>, Error> {
        let scores = sqlx::query_as!(
            Score,
            r#"
            SELECT id, user_id, score, level, play_time, created_at
            FROM scores
            WHERE user_id = ?
            ORDER BY score DESC
            LIMIT ?
            "#,
            user_id,
            limit
        )
        .fetch_all(&self.db)
        .await?;

        Ok(scores)
    }
}
