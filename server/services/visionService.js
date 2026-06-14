import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// ── Diagnóstico de API key al arrancar ───────────────────────────────────────
const _key = process.env.GEMINI_API_KEY ?? ''
if (_key) {
  const masked = `${_key.slice(0, 8)}...${_key.slice(-4)}`
  console.info(`[visionService] GEMINI_API_KEY detectada → ${masked} (${_key.length} chars)`)
} else {
  console.warn('[visionService] GEMINI_API_KEY no definida — el análisis con Gemini no funcionará.')
}

const MODEL = 'gemini-2.5-flash'

// Forced JSON schema — Gemini must return exactly this shape, no prose
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    categoria:     { type: 'string' },
    subtipo:       { type: 'string' },
    color:         { type: 'string' },
    material:      { type: 'string' },
    silueta:       { type: 'string' },
    detalles:      { type: 'array', items: { type: 'string' } },
    queryBusqueda: { type: 'string' },
    marca_visible: { type: 'string', nullable: true },
  },
  required: ['categoria', 'subtipo', 'color', 'material', 'silueta', 'detalles', 'queryBusqueda'],
}

const MAX_RETRIES   = 3
const BASE_DELAY_MS = 5_000  // 5 s → 10 s → 20 s

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Strip markdown fences that some model versions add even with responseMimeType set
function parseJSON(raw) {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  return JSON.parse(cleaned)
}

export async function analyzeImageWithROI(imageBuffer, mimeType, roiPrompt) {
  const imagePart = {
    inlineData: { data: imageBuffer.toString('base64'), mimeType },
  }

  let lastError

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 1) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 2)
      console.warn(`[visionService] Intento ${attempt}/${MAX_RETRIES} — esperando ${delayMs / 1000}s...`)
      await sleep(delayMs)
    }

    try {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents: [
          { parts: [{ text: roiPrompt }, imagePart] },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema:   RESPONSE_SCHEMA,
        },
      })

      const raw = result.text?.trim() ?? ''

      // Defensive parse — never let a malformed response throw a 500
      let attributes
      try {
        attributes = parseJSON(raw)
      } catch (parseErr) {
        throw new Error(`JSON inválido de Gemini (${parseErr.message}): ${raw.slice(0, 200)}`)
      }

      if (!attributes.marca_visible || attributes.marca_visible === 'null') {
        attributes.marca_visible = null
      }

      console.info(`[visionService] OK — modelo: ${MODEL}, intento: ${attempt}`)
      return attributes

    } catch (err) {
      const status = err.message?.match(/\[(\d{3})/)?.[1]

      if (status === '404') {
        throw new Error(`Modelo '${MODEL}' no encontrado (404). Verifica el nombre en https://aistudio.google.com`)
      }

      if (status === '429' || status === '503') {
        console.warn(`[visionService] ${status} en intento ${attempt} — ${err.message.slice(0, 120)}`)
        lastError = err
        continue
      }

      // JSON inválido u otro error → falla sin reintentar (no es un problema de quota)
      throw err
    }
  }

  throw new Error(
    `Sin respuesta de Gemini tras ${MAX_RETRIES} intentos. Último error: ${lastError?.message?.slice(0, 300)}`
  )
}
