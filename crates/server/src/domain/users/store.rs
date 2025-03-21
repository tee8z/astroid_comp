use log::info;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::domain::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: i64,
    pub nostr_pubkey: String,
    pub username: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub username: String,
    pub pubkey: String,
    pub session_id: String,
}

#[derive(Debug, Clone)]
pub struct UserStore {
    db: Pool<Sqlite>,
}

impl UserStore {
    pub fn new(db: Pool<Sqlite>) -> Self {
        Self { db }
    }

    pub async fn ping(&self) -> Result<(), Error> {
        sqlx::query!("SELECT 1 as ping").fetch_one(&self.db).await?;
        Ok(())
    }

    pub async fn find_by_pubkey(&self, pubkey: String) -> Result<Option<User>, Error> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, nostr_pubkey, username, created_at, updated_at
            FROM users
            WHERE nostr_pubkey = ?
            "#,
            pubkey
        )
        .fetch_optional(&self.db)
        .await?;

        Ok(user)
    }

    pub async fn login(&self, pubkey: String) -> Result<UserInfo, Error> {
        // Find or create the user
        let user = match self.find_by_pubkey(pubkey.clone()).await? {
            Some(user) => user,
            None => {
                // Auto-create user with default username
                let username = format!("player_{}", &pubkey[0..8]);
                self.create_user(pubkey.clone(), username).await?
            }
        };

        // Create a session for this user
        let session_id = format!("session_{}", Uuid::now_v7());

        info!("User logged in: {}", user.username);

        Ok(UserInfo {
            username: user.username,
            pubkey,
            session_id,
        })
    }

    pub async fn register(
        &self,
        pubkey: String,
        payload: crate::domain::users::routes::RegisterPayload,
    ) -> Result<UserInfo, Error> {
        // Check if user already exists
        if let Some(_) = self.find_by_pubkey(pubkey.clone()).await? {
            return Err(Error::InvalidInput(format!(
                "User already exists with pubkey: {}",
                pubkey
            )));
        }

        // Create the user with the provided username
        let username = payload
            .username
            .clone()
            .unwrap_or_else(|| format!("player_{}", &pubkey[0..8]));
        let user = self.create_user(pubkey.clone(), username).await?;

        // Create a session for this user
        let session_id = format!("session_{}", Uuid::now_v7());

        info!("User registered: {}", user.username);

        Ok(UserInfo {
            username: user.username,
            pubkey,
            session_id,
        })
    }

    async fn create_user(&self, pubkey: String, username: String) -> Result<User, Error> {
        let now = OffsetDateTime::now_utc().to_string();

        let user_id = sqlx::query!(
            r#"
            INSERT INTO users (nostr_pubkey, username, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            "#,
            pubkey,
            username,
            now,
            now
        )
        .execute(&self.db)
        .await?
        .last_insert_rowid();

        let user = User {
            id: user_id,
            nostr_pubkey: pubkey,
            username,
            created_at: now.clone(),
            updated_at: now,
        };

        Ok(user)
    }
}
