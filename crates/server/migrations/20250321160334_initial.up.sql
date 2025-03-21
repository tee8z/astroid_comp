CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    nostr_pubkey TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime ('now'))
);

CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    last_active TEXT NOT NULL,
    difficulty_factor REAL NOT NULL DEFAULT 1.0,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS game_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    config_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    version TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now')),
    expiration_time TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    level INTEGER NOT NULL,
    play_time INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now')),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
