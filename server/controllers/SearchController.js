import { buildROIPrompt } from '../services/roiService.js'
import { analyzeImageWithROI } from '../services/visionService.js'
import { searchProducts } from '../services/searchService.js'

const DEMO_MODE = !process.env.GEMINI_API_KEY || !process.env.SERPER_API_KEY

const DEMO_PRODUCTS = [
  { nombre_producto: 'Bota cowboy de cuero marrón caña alta',  precio_real: '€ 49.99', tienda_nombre: 'ASOS',    link_afiliado: 'https://www.asos.com',  imagen_url: 'https://picsum.photos/seed/asos-boot/300/400',  match: 98, tier: 1 },
  { nombre_producto: 'Botín de cuero con tacón bloque',        precio_real: '€ 64.95', tienda_nombre: 'Zalando', link_afiliado: 'https://www.zalando.es', imagen_url: 'https://picsum.photos/seed/zal-boot/300/400',   match: 94, tier: 1 },
  { nombre_producto: 'Bota de piel plana con hebilla lateral', precio_real: '€ 35.95', tienda_nombre: 'Zara',    link_afiliado: 'https://www.zara.com',   imagen_url: 'https://picsum.photos/seed/zara-boot/300/400',  match: 91, tier: 1 },
  { nombre_producto: 'Bota occidental ante sintético',         precio_real: '€ 28.90', tienda_nombre: 'Amazon',  link_afiliado: 'https://www.amazon.es',  imagen_url: 'https://picsum.photos/seed/amz-boot/300/400',   match: 87, tier: 2 },
  { nombre_producto: 'Botín con puntera en punta cuero PU',   precio_real: '€ 24.99', tienda_nombre: 'H&M',     link_afiliado: 'https://www.hm.com',     imagen_url: 'https://picsum.photos/seed/hm-boot/300/400',    match: 83, tier: 2 },
  { nombre_producto: 'Bota de caña media ante marrón',        precio_real: '€ 39.99', tienda_nombre: 'Mango',   link_afiliado: 'https://www.mango.com',  imagen_url: 'https://picsum.photos/seed/mango-boot/300/400', match: 79, tier: 3 },
]

const DEMO_ATTRIBUTES = {
  categoria: 'boots', subtipo: 'Bota cowboy de caña alta', color: 'marrón',
  material: 'cuero', silueta: 'caña alta, puntera afilada',
  detalles: ['tacón de bloque', 'costuras decorativas', 'hebilla lateral'],
  marca_visible: null, queryBusqueda: 'botas cowboy cuero marrón caña alta mujer',
  brand_strategy: 'visual_similarity',
}

export const SearchController = {
  async analyze(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ninguna imagen.' })
      }

      const category = req.body.category ?? 'auto'

      if (DEMO_MODE) {
        console.warn('[SearchController] DEMO_MODE — configura GEMINI_API_KEY y SERPER_API_KEY.')
        return res.json({
          demo: true,
          attributes: DEMO_ATTRIBUTES,
          products: DEMO_PRODUCTS,
          meta: { category, totalFound: DEMO_PRODUCTS.length },
        })
      }

      // 1. Build category-aware ROI prompt
      const roiPrompt = buildROIPrompt(category)

      // 2. Gemini Vision analysis
      const attributes = await analyzeImageWithROI(req.file.buffer, req.file.mimetype, roiPrompt)

      // 3. Brand strategy
      attributes.brand_strategy = attributes.marca_visible ? 'brand_match' : 'visual_similarity'

      // 4. Product search
      const products = await searchProducts(attributes)

      res.json({
        demo: false,
        attributes,
        products,
        meta: { category, brandStrategy: attributes.brand_strategy, totalFound: products.length },
      })

    } catch (err) {
      console.error('[SearchController] Error:', err.message)
      // Signal the client to fall back to local browser analysis instead of showing a 500
      res.status(422).json({
        fallbackRequired: true,
        error: 'Análisis visual no disponible temporalmente.',
        detail: err.message,
      })
    }
  },
}
