import { useState, useEffect } from 'react'
import { getFingerprint } from '../services/browserAnalysis'

/**
 * Fetches the server-side learned config for a given category.
 * Returns { config, loading } where config is:
 *   { searchBoost: string, weights: { [attrKey]: { value, score } } }
 *
 * The config is refreshed every time the category changes.
 */
export function useUserConfig(category) {
  const [config, setConfig]   = useState({ searchBoost: '', weights: {} })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!category) return

    let cancelled = false
    setLoading(true)

    const fp = getFingerprint()

    fetch(`/api/config?fp=${encodeURIComponent(fp)}&category=${encodeURIComponent(category)}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setConfig(data.preferences?.[category] ?? { searchBoost: '', weights: {} })
        }
      })
      .catch(() => {}) // config is optional — silently ignore failures
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [category])

  return { config, loading }
}
