-- Per-track artwork cache key so covers show even without an album tag.
ALTER TABLE tracks ADD COLUMN artwork_cache_key TEXT;
