use crate::database::Database;
use crate::error::AppError;
use crate::library::repository::repair_library_indexes;

const MIGRATION_0001: &str = include_str!("0001_init.sql");
const MIGRATION_0002: &str = include_str!("0002_listening_stats.sql");
const MIGRATION_0004: &str = include_str!("0004_scrobble_client_event.sql");
const MIGRATION_0005: &str = include_str!("0005_durable_favorites.sql");

pub fn run(db: &Database) -> Result<(), AppError> {
    db.conn().execute_batch(
        "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );
        ",
    )?;

    let current: i64 = db
        .conn()
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current < 1 {
        db.conn().execute_batch(MIGRATION_0001)?;
        db.conn().execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (1, datetime('now'))",
            [],
        )?;
    }

    let current: i64 = db
        .conn()
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current < 2 {
        db.conn().execute_batch(MIGRATION_0002)?;
        db.conn().execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (2, datetime('now'))",
            [],
        )?;
    }

    let current: i64 = db
        .conn()
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current < 3 {
        // Index-in-place repair: normalize stored paths and collapse nested roots.
        repair_library_indexes(db)?;
        db.conn().execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (3, datetime('now'))",
            [],
        )?;
    }

    let current: i64 = db
        .conn()
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current < 4 {
        db.conn().execute_batch(MIGRATION_0004)?;
        db.conn().execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (4, datetime('now'))",
            [],
        )?;
    }

    let current: i64 = db
        .conn()
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current < 5 {
        db.conn().execute_batch(MIGRATION_0005)?;
        db.conn().execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (5, datetime('now'))",
            [],
        )?;
    }

    let current: i64 = db
        .conn()
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current < 6 {
        apply_migration_0006(db)?;
        db.conn().execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (6, datetime('now'))",
            [],
        )?;
    }

    let current: i64 = db
        .conn()
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current < 7 {
        if !table_has_column(db, "tracks", "artwork_cache_key")? {
            db.conn()
                .execute("ALTER TABLE tracks ADD COLUMN artwork_cache_key TEXT", [])?;
        }
        db.conn().execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (7, datetime('now'))",
            [],
        )?;
    }

    let current: i64 = db
        .conn()
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current < 8 {
        db.conn().execute_batch(include_str!("0008_content_hash_unique.sql"))?;
        // Collapse existing twin rows (same title+size+duration) without re-reading audio.
        let _ = crate::library::repository::collapse_duplicate_tracks(db);
        db.conn().execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (8, datetime('now'))",
            [],
        )?;
    }

    Ok(())
}

fn table_has_column(db: &Database, table: &str, column: &str) -> Result<bool, AppError> {
    let mut stmt = db.conn().prepare(&format!("PRAGMA table_info({table})"))?;
    let names = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(names.iter().any(|n| n == column))
}

fn favorites_has_column(db: &Database, column: &str) -> Result<bool, AppError> {
    let mut stmt = db.conn().prepare("PRAGMA table_info(favorites)")?;
    let names = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(names.iter().any(|n| n == column))
}

fn ensure_favorites_column(db: &Database, ddl: &str, column: &str) -> Result<(), AppError> {
    if favorites_has_column(db, column)? {
        return Ok(());
    }
    db.conn().execute(ddl, [])?;
    Ok(())
}

/// Idempotent: recovers if a previous attempt added columns then failed the backfill.
fn apply_migration_0006(db: &Database) -> Result<(), AppError> {
    ensure_favorites_column(
        db,
        "ALTER TABLE favorites ADD COLUMN album_artist TEXT",
        "album_artist",
    )?;
    ensure_favorites_column(db, "ALTER TABLE favorites ADD COLUMN genre TEXT", "genre")?;
    ensure_favorites_column(db, "ALTER TABLE favorites ADD COLUMN year INTEGER", "year")?;
    ensure_favorites_column(
        db,
        "ALTER TABLE favorites ADD COLUMN track_number INTEGER",
        "track_number",
    )?;
    ensure_favorites_column(
        db,
        "ALTER TABLE favorites ADD COLUMN artwork_cache_key TEXT",
        "artwork_cache_key",
    )?;
    ensure_favorites_column(
        db,
        "ALTER TABLE favorites ADD COLUMN has_artwork INTEGER NOT NULL DEFAULT 0",
        "has_artwork",
    )?;

    db.conn().execute_batch(
        "
        UPDATE favorites
        SET
          album_artist = (
            SELECT t.album_artist FROM tracks t
            WHERE t.id = CAST(favorites.entity_id AS INTEGER)
          ),
          genre = (
            SELECT t.genre FROM tracks t
            WHERE t.id = CAST(favorites.entity_id AS INTEGER)
          ),
          year = (
            SELECT t.year FROM tracks t
            WHERE t.id = CAST(favorites.entity_id AS INTEGER)
          ),
          track_number = (
            SELECT t.track_number FROM tracks t
            WHERE t.id = CAST(favorites.entity_id AS INTEGER)
          ),
          artwork_cache_key = (
            SELECT a.cache_key
            FROM tracks t
            LEFT JOIN albums al ON al.id = t.album_id
            LEFT JOIN artwork a ON a.id = al.artwork_id
            WHERE t.id = CAST(favorites.entity_id AS INTEGER)
          ),
          has_artwork = COALESCE(
            (
              SELECT CASE WHEN t.has_artwork = 1 THEN 1 ELSE 0 END
              FROM tracks t
              WHERE t.id = CAST(favorites.entity_id AS INTEGER)
            ),
            0
          )
        WHERE entity_type = 'track';
        ",
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn applies_initial_migration() {
        let dir = tempdir().expect("tempdir");
        let path = dir.path().join("test.db");
        let db = Database::open(&path).expect("open");
        run(&db).expect("migrate");
        run(&db).expect("migrate idempotent");

        let count: i64 = db
            .conn()
            .query_row(
                "SELECT COUNT(*) FROM schema_migrations WHERE version = 7",
                [],
                |row| row.get(0),
            )
            .expect("count");
        assert_eq!(count, 1);

        let settings: i64 = db
            .conn()
            .query_row("SELECT COUNT(*) FROM settings", [], |row| row.get(0))
            .expect("settings");
        assert!(settings >= 1);

        let scrobbles: i64 = db
            .conn()
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='scrobbles'",
                [],
                |row| row.get(0),
            )
            .expect("scrobbles table");
        assert_eq!(scrobbles, 1);
    }
}
