import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// ── Diagnóstico de API key al arrancar el servidor ───────────────────────────
const _key = process.env.GEMINI_API_KEY ?? ''
if (_key) {
  const masked = `${_key.slice(0, 8)}...${_key.slice(-4)}`
  console.info(`[visionService] GEMINI_API_KEY detectada → ${masked} (${_key.length} chars)`)
} else {
  console.warn('[visionService] GEMINI_API_KEY no definida — el análisis con Gemini no funcionará.')
}

const MODEL = 'gemini-2.5-flash'

const MAX_RETRIES   = 3
const BASE_DELAY_MS = 5_000   // 5 s → 10 s → 20 s (backoff x2 cada intento)

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export async function analyzeImageWithROI(imageBuffer, mimeType, roiPrompt) {
  const imagePart = {
    inlineData: { data: imageBuffer.toString('base64'), mimeType },
  }

  let lastError

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 1) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 2) // 5 000, 10 000, 20 000
      console.warn(
        `[visionService] Intento ${attempt}/${MAX_RETRIES} — esperando ${delayMs / 1000}s antes de reintentar...`
      )
      await sleep(delayMs)
    }

    try {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            parts: [
              { text: roiPrompt },
              imagePart,
            ],
          },
        ],
      })

      const text = result.text.trim()

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error(`JSON no encontrado en respuesta: ${text.slice(0, 200)}`)
      }

      const attributes = JSON.parse(jsonMatch[0])
      if (!attributes.marca_visible || attributes.marca_visible === 'null') {
        attributes.marca_visible = null
      }

      console.info(`[visionService] OK — modelo: ${MODEL}, intento: ${attempt}`)
      return attributes

    } catch (err) {
      const status = err.message?.match(/\[(\d{3})/)?.[1]

      if (status === '404') {
        throw new Error(
          `Modelo '${MODEL}' no encontrado (404). Verifica el nombre en https://aistudio.google.com`
        )
      }

      if (status === '429' || status === '503') {
        console.warn(`[visionService] ${status} en intento ${attempt} — ${err.message.slice(0, 120)}`)
        lastError = err
        continue
      }

      throw err
    }
  }

  throw new Error(
    `Sin respuesta de Gemini tras ${MAX_RETRIES} intentos (backoff 5s→10s→20s). ` +
    `Último error: ${lastError?.message?.slice(0, 300)}`
  )
}
