-- Durable scrobble dedupe across app restarts / crash recovery
ALTER TABLE scrobbles ADD COLUMN client_event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_scrobbles_client_event
  ON scrobbles(client_event_id)
  WHERE client_event_id IS NOT NULL;
