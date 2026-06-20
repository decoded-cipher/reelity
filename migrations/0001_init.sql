CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  prompt TEXT NOT NULL,
  action TEXT NOT NULL,
  reply TEXT,
  format TEXT,
  product_name TEXT,
  site_url TEXT,
  concept TEXT,
  caption TEXT,
  spec TEXT,
  assets TEXT,
  model TEXT,
  video_url TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_generations_session ON generations (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_generations_created ON generations (created_at);
