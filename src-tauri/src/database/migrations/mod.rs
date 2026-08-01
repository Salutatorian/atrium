use crate::database::Database;
use crate::error::AppError;

const MIGRATION_0001: &str = include_str!("0001_init.sql");

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
                "SELECT COUNT(*) FROM schema_migrations WHERE version = 1",
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
    }
}
