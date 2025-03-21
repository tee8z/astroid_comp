# astroid_comp
Simple astroid game with daily competitions for sats


setup db:
```
sqlx database create --database-url sqlite:./data/game.db
sqlx migrate run --database-url sqlite:./data/game.db --source ./crates/server/migrations
```
