/**
 * Puente entre el backend Node.js y el Python Segmentation Worker.
 *
 * Variables de entorno requeridas:
 *   SEGMENTATION_WORKER_URL — URL pública del servicio Python en Railway
 *                             Ej: https://dxmg-worker-production.up.railway.app
 *
 * Uso en SearchController:
 *   import { segmentImage, pollSegmentResult } from './segmentService.js'
 *
 *   // Síncrono (espera resultado):
 *   const { segmentos } = await segmentImage(req.file.buffer, req.file.mimetype)
 *
 *   // Asíncrono (encola y devuelve task_id):
 *   const { task_id } = await segmentImageAsync(req.file.buffer, req.file.mimetype)
 *   const result = await pollSegmentResult(task_id)
 */

const WORKER_URL = (process.env.SEGMENTATION_WORKER_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS  = 90_000   // 90 s máximo de espera

// ── Segmentación síncrona ────────────────────────────────────────────────────

export async function segmentImage(imageBuffer, mimeType = 'image/jpeg') {
  const form = new FormData()
  form.append('file', new Blob([imageBuffer], { type: mimeType }), 'image.jpg')

  const res = await fetch(`${WORKER_URL}/segment`, { method: 'POST', body: form })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Worker /segment error ${res.status}: ${text.slice(0, 200)}`)
  }

  return res.json() // { total: number, segmentos: [...] }
}

// ── Segmentación asíncrona (Celery) ─────────────────────────────────────────

export async function segmentImageAsync(imageBuffer, mimeType = 'image/jpeg') {
  const form = new FormData()
  form.append('file', new Blob([imageBuffer], { type: mimeType }), 'image.jpg')

  const res = await fetch(`${WORKER_URL}/segment/async`, { method: 'POST', body: form })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Worker /segment/async error ${res.status}: ${text.slice(0, 200)}`)
  }

  return res.json() // { task_id, status: "encolado", poll_url }
}

// ── Polling del resultado ────────────────────────────────────────────────────

export async function pollSegmentResult(taskId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    const res  = await fetch(`${WORKER_URL}/segment/result/${taskId}`)
    const data = await res.json()

    if (data.status === 'completado') return data.resultado
    if (data.status === 'error')      throw new Error(`Worker task error: ${data.detalle}`)

    // pendiente | recibido | procesando | reintentando → seguir esperando
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }

  throw new Error(`Timeout esperando resultado del worker (task: ${taskId})`)
}
