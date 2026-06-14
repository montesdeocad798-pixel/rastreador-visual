import { STORE_TIERS, MIN_RESULTS } from '../../src/config/storesConfig.js'

const SERPER_URL = 'https://google.serper.dev/shopping'

/**
 * Search by a plain query string (used by the hybrid/local analysis path).
 * Returns { products, tierUsed }.
 */
export async function searchByQuery(queryStr, _category) {
  for (const tierNum of [1, 2, 3]) {
    const stores = STORE_TIERS[tierNum] ?? []
    const siteFilter = stores.map(s => `site:${s.domain}`).join(' OR ')
    const fullQuery = `${queryStr} (${siteFilter})`

    console.info(`[search] Tier ${tierNum} (local): "${fullQuery}"`)

    const raw = await callSerper(fullQuery)

    if (raw.length >= MIN_RESULTS) {
      return {
        tierUsed: tierNum,
        products: raw.map((item, i) => ({
          nombre_producto: item.title ?? 'Producto',
          precio_real:     item.price ?? 'Precio no disponible',
          tienda_nombre:   cleanSource(item.source),
          link_afiliado:   item.link,
          imagen_url:      item.imageUrl ?? null,
          match:           Math.min(98, 72 + Math.max(0, 6 - i)),
          tier:            tierNum,
        })),
      }
    }

    console.info(`[search] Tier ${tierNum}: solo ${raw.length} resultados, escalando...`)
  }

  return { products: [], tierUsed: 3 }
}

/**
 * Busca productos reales usando Serper.dev Shopping API con cascada de tiers.
 *
 * Estrategia de query:
 * - Si hay marca visible: empieza con búsqueda de marca exacta.
 * - Si no hay marca: busca solo por atributos visuales (Similitud Visual pura).
 * - Escala de Tier 1 a Tier 3 hasta obtener MIN_RESULTS resultados.
 */
export async function searchProducts(attributes) {
  const {
    query_busqueda,
    marca_visible,
    genero_estimado,
    brand_strategy,
  } = attributes

  const genderSuffix = genero_estimado === 'mujer'
    ? ' mujer'
    : genero_estimado === 'hombre'
    ? ' hombre'
    : ''

  const baseQuery = brand_strategy === 'brand_match' && marca_visible
    ? `${marca_visible} ${query_busqueda}${genderSuffix}`
    : `${query_busqueda}${genderSuffix}`

  for (const tierNum of [1, 2, 3]) {
    const stores = STORE_TIERS[tierNum] ?? []
    const siteFilter = stores.map(s => `site:${s.domain}`).join(' OR ')
    const query = `${baseQuery} (${siteFilter})`

    console.info(`[search] Tier ${tierNum}: "${query}"`)

    const raw = await callSerper(query)

    if (raw.length >= MIN_RESULTS) {
      return raw.map((item, i) => ({
        nombre_producto: item.title ?? 'Producto',
        precio_real:     item.price ?? 'Precio no disponible',
        tienda_nombre:   cleanSource(item.source),
        link_afiliado:   item.link,
        imagen_url:      item.imageUrl ?? null,
        match:           scoreMatch(attributes, item, i),
        tier:            tierNum,
      }))
    }

    console.info(`[search] Tier ${tierNum}: solo ${raw.length} resultados, escalando...`)
  }

  return []
}

async function callSerper(query) {
  const res = await fetch(SERPER_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, gl: 'es', hl: 'es', num: 12 }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Serper API ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.shopping ?? []
}

function cleanSource(source) {
  if (!source) return 'Tienda'
  return source
    .replace(/\.(com|es|co\.uk|net|org).*/i, '')
    .replace(/-/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function scoreMatch(attributes, item, index) {
  let score = 72
  const title = (item.title ?? '').toLowerCase()
  if (attributes.color_principal && title.includes(attributes.color_principal.toLowerCase())) score += 8
  if (attributes.material && title.includes(attributes.material.toLowerCase())) score += 8
  const firstWord = (attributes.tipo ?? '').split(' ')[0].toLowerCase()
  if (firstWord && title.includes(firstWord)) score += 8
  // Primeros resultados reciben bonus leve de posición
  score += Math.max(0, 6 - index)
  return Math.min(score, 98)
}
