import pg from 'pg'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { Pool } = pg

let _pool = null

function pool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30_000,
    })
    _pool.on('error', (err) => console.error('[DB] Pool error:', err.message))
  }
  return _pool
}

export function query(text, params) {
  return pool().query(text, params)
}

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn('[DB] Sin DATABASE_URL — almacenamiento deshabilitado, modo sin persistencia.')
    return
  }
  const sql = readFileSync(path.join(__dirname, '../migrations/001_schema.sql'), 'utf8')
  await query(sql)
  console.info('[DB] Migraciones aplicadas.')
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export async function createSession(fingerprint, category, attributes) {
  const { rows } = await query(
    `INSERT INTO search_sessions (fingerprint, category, attributes)
     VALUES ($1, $2, $3) RETURNING id`,
    [fingerprint, category, JSON.stringify(attributes)]
  )
  return rows[0].id
}

export async function updateSessionResults(sessionId, resultsCount, tierUsed) {
  await query(
    `UPDATE search_sessions SET results_count=$1, tier_used=$2 WHERE id=$3`,
    [resultsCount, tierUsed, sessionId]
  )
}

// ─── Feedback ───────────────────────────────────────────────────────────────

export async function saveFeedback(sessionId, productId, storeName, confirmed) {
  await query(
    `INSERT INTO feedback_events (session_id, product_id, store_name, confirmed)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, productId ?? '', storeName ?? '', confirmed]
  )
}

// ─── Preferences (EMA score update) ─────────────────────────────────────────

export async function upsertPreference(fingerprint, category, key, value, confirmed) {
  const newScore = confirmed ? 1.0 : 0.0
  await query(
    `INSERT INTO user_preferences
       (fingerprint, category, attribute_key, attribute_value, score, total_seen, confirm_count)
     VALUES ($1, $2, $3, $4, $5, 1, $6)
     ON CONFLICT (fingerprint, category, attribute_key, attribute_value)
     DO UPDATE SET
       -- EMA: α=0.3 means recent feedback counts 30%, history 70%
       score         = 0.7 * user_preferences.score + 0.3 * $5,
       total_seen    = user_preferences.total_seen + 1,
       confirm_count = user_preferences.confirm_count + $6,
       last_updated  = NOW()`,
    [fingerprint, category, key, String(value).slice(0, 200), newScore, confirmed ? 1 : 0]
  )
}

export async function getUserPreferences(fingerprint, category) {
  const { rows } = await query(
    `SELECT attribute_key, attribute_value, score, confirm_count, total_seen
     FROM user_preferences
     WHERE fingerprint=$1 AND category=$2
     ORDER BY score DESC`,
    [fingerprint, category]
  )
  return rows
}
