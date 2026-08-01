mod connection;
mod migrations;

pub use connection::Database;

use crate::error::AppError;
use std::path::Path;

pub fn open_database(path: &Path) -> Result<Database, AppError> {
    let db = Database::open(path)?;
    migrations::run(&db)?;
    Ok(db)
}
