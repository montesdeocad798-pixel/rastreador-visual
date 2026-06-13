import { useState, useCallback } from 'react'

const STORAGE_KEY = 'rv_feedback_log'

// Número de rechazos para bloquear un producto permanentemente
export const BLOCK_THRESHOLD = 3

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveLog(log) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
}

/**
 * Hook de aprendizaje por feedback.
 *
 * Persiste en localStorage un mapa:
 *   { [productId]: { count: number, store: string, blockedAt: string|null } }
 *
 * Tras BLOCK_THRESHOLD rechazos, el producto queda bloqueado y se filtra
 * de los resultados en todas las búsquedas futuras de la sesión del dispositivo.
 *
 * En producción este log se enviaría a un endpoint para ajustar los rankings
 * del modelo de recomendación.
 */
export function useFeedback() {
  const [log, setLog] = useState(loadLog)

  const report = useCallback((productId, meta = {}) => {
    setLog(prev => {
      const entry = prev[productId] || { count: 0, blockedAt: null, ...meta }
      const count = entry.count + 1
      const updated = {
        ...prev,
        [productId]: {
          ...entry,
          ...meta,
          count,
          blockedAt: count >= BLOCK_THRESHOLD && !entry.blockedAt
            ? new Date().toISOString()
            : entry.blockedAt,
        },
      }
      saveLog(updated)
      return updated
    })
  }, [])

  const restore = useCallback((productId) => {
    setLog(prev => {
      const updated = { ...prev }
      delete updated[productId]
      saveLog(updated)
      return updated
    })
  }, [])

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setLog({})
  }, [])

  const getCount   = (productId) => log[productId]?.count ?? 0
  const isBlocked  = (productId) => (log[productId]?.count ?? 0) >= BLOCK_THRESHOLD

  const blockedEntries = Object.entries(log).filter(
    ([, v]) => v.count >= BLOCK_THRESHOLD
  )

  return { log, report, restore, clearAll, getCount, isBlocked, blockedEntries }
}
