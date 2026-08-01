-- Richer liked-song snapshots (survive index removal / deleted files).
-- has_artwork stays NOT NULL via COALESCE — orphaned likes must not write NULL.

ALTER TABLE favorites ADD COLUMN album_artist TEXT;
ALTER TABLE favorites ADD COLUMN genre TEXT;
ALTER TABLE favorites ADD COLUMN year INTEGER;
ALTER TABLE favorites ADD COLUMN track_number INTEGER;
ALTER TABLE favorites ADD COLUMN artwork_cache_key TEXT;
ALTER TABLE favorites ADD COLUMN has_artwork INTEGER NOT NULL DEFAULT 0;

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
