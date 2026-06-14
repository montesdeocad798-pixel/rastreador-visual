import { getUserPreferences, upsertPreference } from './postgresService.js'

const DB_ENABLED = () => !!process.env.DATABASE_URL

/**
 * Builds a config object for the browser based on learned user preferences.
 * Returns { searchBoost: string, weights: object }
 *
 * searchBoost: extra Spanish keywords added to the Serper query
 *   (only attributes with score > 0.75 and ≥2 confirmations)
 * weights: all known scores per attribute, used by the browser to
 *   optionally prioritize certain extraction paths
 */
export async function generateConfig(fingerprint, category) {
  if (!DB_ENABLED()) return { searchBoost: '', weights: {} }

  const prefs = await getUserPreferences(fingerprint, category).catch(() => [])
  if (prefs.length === 0) return { searchBoost: '', weights: {} }

  // Build a nested map: { attribute_key → [{ value, score, confirm_count }] }
  const byKey = {}
  for (const row of prefs) {
    ;(byKey[row.attribute_key] ??= []).push({
      value:         row.attribute_value,
      score:         row.score,
      confirm_count: row.confirm_count,
    })
  }

  const weights = {}
  const boostTerms = []

  for (const [key, entries] of Object.entries(byKey)) {
    const top = entries[0] // already sorted by score DESC from the DB query
    weights[key] = { value: top.value, score: top.score }

    // Only inject into search query when the preference is strong and confirmed
    if (top.score > 0.75 && top.confirm_count >= 2) {
      // Color values are stored as Spanish names (e.g. 'marrón') — safe to pass to Serper
      boostTerms.push(top.value)
    }
  }

  return {
    searchBoost: boostTerms.slice(0, 3).join(' '),
    weights,
  }
}

/**
 * Called after the user confirms or rejects a product.
 * Updates EMA score for every attribute in the current session's analysis.
 */
export async function recordAttributeFeedback(fingerprint, category, attributes, confirmed) {
  if (!DB_ENABLED()) return

  // Filter out null/undefined/empty values and internal fields we don't want to learn from
  const SKIP_KEYS = new Set(['processingMs', 'fingerprint'])
  const entries = Object.entries(attributes).filter(
    ([k, v]) => !SKIP_KEYS.has(k) && v !== null && v !== undefined && String(v).trim().length > 0
  )

  await Promise.allSettled(
    entries.map(([key, value]) =>
      upsertPreference(fingerprint, category, key, String(value), confirmed)
    )
  )
}
