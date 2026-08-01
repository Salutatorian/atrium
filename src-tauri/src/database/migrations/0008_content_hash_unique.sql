-- Unique content identity for merge-on-import (same audio → one library row).
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_content_hash
ON files(content_hash)
WHERE content_hash IS NOT NULL AND content_hash != '';
