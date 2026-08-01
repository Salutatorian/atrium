-- Snapshot liked tracks so hearts survive missing files / removed folders.
ALTER TABLE favorites ADD COLUMN title TEXT;
ALTER TABLE favorites ADD COLUMN artist TEXT;
ALTER TABLE favorites ADD COLUMN album TEXT;
ALTER TABLE favorites ADD COLUMN duration_ms INTEGER;
ALTER TABLE favorites ADD COLUMN path TEXT;
ALTER TABLE favorites ADD COLUMN track_uid TEXT;

UPDATE favorites
SET
  title = (
    SELECT t.title FROM tracks t
    WHERE t.id = CAST(favorites.entity_id AS INTEGER)
  ),
  artist = (
    SELECT t.artist FROM tracks t
    WHERE t.id = CAST(favorites.entity_id AS INTEGER)
  ),
  album = (
    SELECT t.album FROM tracks t
    WHERE t.id = CAST(favorites.entity_id AS INTEGER)
  ),
  duration_ms = (
    SELECT t.duration_ms FROM tracks t
    WHERE t.id = CAST(favorites.entity_id AS INTEGER)
  ),
  path = (
    SELECT f.path FROM tracks t
    JOIN files f ON f.id = t.file_id
    WHERE t.id = CAST(favorites.entity_id AS INTEGER)
  ),
  track_uid = (
    SELECT t.track_uid FROM tracks t
    WHERE t.id = CAST(favorites.entity_id AS INTEGER)
  )
WHERE entity_type = 'track';
