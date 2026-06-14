import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const MODEL         = 'gemini-2.5-flash'
const RERANK_LIMIT  = 15
const FETCH_TIMEOUT = 3_000   // ms per thumbnail — skip if slower

const RERANK_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      index: { type: 'integer' },
      score: { type: 'integer' },
    },
    required: ['index', 'score'],
  },
}

// Hint passed to Gemini so it knows where to look in the reference image
const CATEGORY_HINT = {
  boots:       'calzado tipo botas o botines (parte inferior de la imagen)',
  sneakers:    'zapatillas o calzado deportivo (parte inferior)',
  bag:         'bolso, cartera o mochila',
  jacket:      'chaqueta, abrigo o cazadora (parte superior)',
  shirt:       'camisa, camiseta o top (parte superior)',
  pants:       'pantalón, jeans o leggins (parte inferior)',
  skirt:       'falda o minifalda (parte inferior de la imagen)',
  dress:       'vestido largo o midi (prenda completa)',
  accessories: 'accesorio, joyería o complemento',
}

// Fetch a thumbnail with a hard timeout — AbortController cancels the request
async function fetchWithTimeout(url, ms) {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf      = await res.arrayBuffer()
    const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? 'image/jpeg'
    return { data: Buffer.from(buf).toString('base64'), mimeType }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Re-ranks up to RERANK_LIMIT products by visual similarity to the original image.
 *
 * Guarantees:
 *  - Never throws — returns original products on any failure
 *  - Requires req.file to exist (caller must check before calling)
 *  - Downloads thumbnails in parallel; slow/broken ones are silently skipped
 *  - Products beyond RERANK_LIMIT are appended unchanged at the end
 */
export async function rerankByVisualSimilarity(imageBuffer, mimeType, products, category) {
  // Guards — all safe exits that preserve original order
  if (!process.env.GEMINI_API_KEY) return products
  if (!imageBuffer)                 return products
  if (!products?.length)            return products

  const candidates = products.slice(0, RERANK_LIMIT)
  const hint       = CATEGORY_HINT[category] ?? 'prenda de moda'

  // ── 1. Download thumbnails in parallel, skip failures ───────────────────
  const settled = await Promise.allSettled(
    candidates.map((p, originalIdx) =>
      p.imagen_url
        ? fetchWithTimeout(p.imagen_url, FETCH_TIMEOUT).then(img => ({ originalIdx, img }))
        : Promise.reject(new Error('sin URL'))
    )
  )

  const downloaded = settled.filter(r => r.status === 'fulfilled').map(r => r.value)
  const skipped    = settled.length - downloaded.length

  if (downloaded.length === 0) {
    console.warn('[rerank] Sin miniaturas accesibles, manteniendo orden original.')
    return products
  }
  if (skipped > 0) console.info(`[rerank] ${downloaded.length} OK, ${skipped} omitidas (timeout/error).`)

  // ── 2. Build Gemini prompt with reference image + labeled thumbnails ─────
  const parts = [
    {
      text:
        `Eres un motor de similitud visual para e-commerce de moda.\n` +
        `La primera imagen es la prenda de referencia: ${hint}.\n` +
        `A continuación hay ${downloaded.length} miniaturas de productos etiquetadas con su índice (número entero).\n` +
        `Devuelve un array JSON con un objeto {index, score} por miniatura, donde score es 0–100 ` +
        `según la similitud visual con la referencia (color, forma, material, detalles).\n` +
        `Solo evalúa lo que ves visualmente. Devuelve ÚNICAMENTE el JSON.`,
    },
    // Reference image (full photo — Gemini uses the category hint to focus on the ROI)
    { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
    // Thumbnails labeled by their original index in the products array
    ...downloaded.flatMap(({ originalIdx, img }) => [
      { text: `Miniatura índice ${originalIdx}:` },
      { inlineData: img },
    ]),
  ]

  try {
    const result = await ai.models.generateContent({
      model:    MODEL,
      contents: [{ parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema:   RERANK_SCHEMA,
      },
    })

    const raw = (result.text ?? '').trim()
    const scores = JSON.parse(
      raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    )

    // Build originalIdx → score map
    const scoreMap = {}
    for (const { index, score } of scores) scoreMap[index] = score

    // Apply scores and sort candidates; unscored get -1 and sort last within candidates
    const scoredCandidates = candidates
      .map((p, i) => ({ p, score: scoreMap[i] ?? -1 }))
      .sort((a, b) => b.score - a.score)

    const rest = products.slice(RERANK_LIMIT)

    const reranked = [
      ...scoredCandidates.map(({ p, score }) => ({
        ...p,
        match: score >= 0 ? score : p.match,  // replace match with Gemini visual score
      })),
      ...rest,
    ]

    const best = scoredCandidates[0]?.score ?? '—'
    console.info(`[rerank] OK — ${downloaded.length} imágenes, mejor score visual: ${best}`)
    return reranked

  } catch (err) {
    // JSON parse error, Gemini error, network error — all fall back silently
    console.warn('[rerank] Falló, orden original conservado:', err.message.slice(0, 120))
    return products
  }
}
