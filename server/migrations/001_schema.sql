CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS search_sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint  VARCHAR(64) NOT NULL,
  category     VARCHAR(50) NOT NULL,
  attributes   JSONB       NOT NULL,
  results_count INT        DEFAULT 0,
  tier_used    INT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_events (
  id         SERIAL  PRIMARY KEY,
  session_id UUID    REFERENCES search_sessions(id) ON DELETE CASCADE,
  product_id VARCHAR(300) NOT NULL,
  store_name VARCHAR(100),
  confirmed  BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id              SERIAL      PRIMARY KEY,
  fingerprint     VARCHAR(64) NOT NULL,
  category        VARCHAR(50) NOT NULL,
  attribute_key   VARCHAR(100) NOT NULL,
  attribute_value VARCHAR(200) NOT NULL,
  score           FLOAT       NOT NULL DEFAULT 0.5,
  total_seen      INT         DEFAULT 1,
  confirm_count   INT         DEFAULT 0,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fingerprint, category, attribute_key, attribute_value)
);

CREATE INDEX IF NOT EXISTS idx_sessions_fp  ON search_sessions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_prefs_lookup ON user_preferences(fingerprint, category);
