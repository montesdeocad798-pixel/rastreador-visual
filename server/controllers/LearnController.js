import { searchByQuery } from '../services/searchService.js'
import { createSession, updateSessionResults, saveFeedback } from '../services/postgresService.js'
import { generateConfig, recordAttributeFeedback } from '../services/learningEngine.js'

const DEMO_PRODUCTS = [
  { nombre_producto: 'Bota cowboy de cuero marrón', precio_real: '€ 49.99', tienda_nombre: 'ASOS',    link_afiliado: 'https://www.asos.com',  imagen_url: 'https://picsum.photos/seed/asos/300/400',   match: 97, tier: 1 },
  { nombre_producto: 'Botín de cuero tacón bloque', precio_real: '€ 64.95', tienda_nombre: 'Zalando', link_afiliado: 'https://www.zalando.es', imagen_url: 'https://picsum.photos/seed/zalan/300/400',  match: 93, tier: 1 },
  { nombre_producto: 'Bota plana piel con hebilla',  precio_real: '€ 35.95', tienda_nombre: 'Zara',   link_afiliado: 'https://www.zara.com',   imagen_url: 'https://picsum.photos/seed/zara/300/400',   match: 89, tier: 1 },
]

export const LearnController = {
  // POST /api/analyze-local
  // Body: { category, attributes, fingerprint }
  async analyzeLocal(req, res) {
    try {
      const { category, attributes, fingerprint } = req.body

      if (!category || !attributes) {
        return res.status(400).json({ error: 'category y attributes son requeridos.' })
      }

      const fp = String(fingerprint ?? 'anonymous').slice(0, 64)

      // 1. Load learned preferences and build search boost
      const config = await generateConfig(fp, category).catch(() => ({ searchBoost: '', weights: {} }))

      // 2. Build search query from browser-extracted attributes
      const query = buildSearchQuery(category, attributes, config.searchBoost)

      let products = []
      let tierUsed = null

      if (!process.env.SERPER_API_KEY) {
        products = DEMO_PRODUCTS
      } else {
        const result = await searchByQuery(query, category)
        products = result.products
        tierUsed = result.tierUsed
      }

      // 3. Persist session (non-blocking — never fails the request)
      let sessionId = null
      if (process.env.DATABASE_URL) {
        sessionId = await createSession(fp, category, attributes).catch(() => null)
        if (sessionId) {
          updateSessionResults(sessionId, products.length, tierUsed).catch(() => {})
        }
      }

      res.json({
        products,
        sessionId,
        config,
        demo: !process.env.SERPER_API_KEY,
        meta: { query, category, tier: tierUsed },
      })
    } catch (err) {
      console.error('[LearnController] analyzeLocal error:', err.message)
      res.status(500).json({ error: 'Error en el análisis local.', detail: err.message })
    }
  },

  // POST /api/feedback
  // Body: { sessionId, productId, storeName, confirmed, fingerprint, category, attributes }
  async feedback(req, res) {
    try {
      const { sessionId, productId, storeName, confirmed, fingerprint, category, attributes } = req.body

      if (productId === undefined || confirmed === undefined) {
        return res.status(400).json({ error: 'productId y confirmed son requeridos.' })
      }

      const fp = String(fingerprint ?? 'anonymous').slice(0, 64)

      if (process.env.DATABASE_URL && sessionId) {
        await saveFeedback(sessionId, productId, storeName ?? '', confirmed).catch(() => {})
      }

      if (attributes && category) {
        await recordAttributeFeedback(fp, category, attributes, confirmed).catch(() => {})
      }

      res.json({ ok: true })
    } catch (err) {
      console.error('[LearnController] feedback error:', err.message)
      res.status(500).json({ error: 'Error registrando feedback.' })
    }
  },

  // GET /api/config?fp=<fingerprint>&category=<category>
  async getConfig(req, res) {
    const fp = String(req.query.fp ?? 'anonymous').slice(0, 64)
    const category = req.query.category

    if (!category) return res.json({ preferences: {} })

    const config = await generateConfig(fp, category).catch(() => ({ searchBoost: '', weights: {} }))
    res.json({ preferences: { [category]: config } })
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSearchQuery(category, attributes, boost) {
  const parts = []

  // Color name (stored as Spanish by the browser)
  if (attributes.dominantColorName) parts.push(attributes.dominantColorName)

  // Texture
  if (attributes.textureType && attributes.textureType !== 'liso') {
    parts.push(attributes.textureType)
  }

  // Material hint from TF.js (optional)
  if (attributes.materialHint) parts.push(attributes.materialHint)

  // Category label
  const CATEGORY_ES = {
    boots: 'botas mujer', sneakers: 'zapatillas mujer', bag: 'bolso mujer',
    jacket: 'chaqueta mujer', shirt: 'camiseta mujer', pants: 'pantalón mujer',
    dress: 'vestido mujer', accessories: 'accesorio mujer',
  }
  parts.push(CATEGORY_ES[category] ?? `${category} mujer`)

  // Learned preferences boost
  if (boost) parts.push(boost)

  return parts.join(' ').trim()
}
