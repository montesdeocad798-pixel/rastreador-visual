import { STORE_TIERS } from '../../src/config/storesConfig.js'

const SERPER_URL = 'https://google.serper.dev/shopping'

// ── Domain → tier lookup (built once at module init) ─────────────────────────
const DOMAIN_TIER = {}
for (const [tierNum, stores] of Object.entries(STORE_TIERS)) {
  for (const store of stores) {
    DOMAIN_TIER[store.domain] = Number(tierNum)
  }
}

function tierOf(item) {
  const url = (item.link ?? '').toLowerCase()
  for (const [domain, tier] of Object.entries(DOMAIN_TIER)) {
    if (url.includes(domain)) return tier
  }
  return 99
}

// Reorders results so Tier 1 stores appear first. Never discards results.
function sortByTier(items) {
  return [...items].sort((a, b) => tierOf(a) - tierOf(b))
}

// ── Hybrid / local-analysis path ─────────────────────────────────────────────

export async function searchByQuery(queryStr, _category) {
  console.info(`[search] Query natural: "${queryStr}"`)
  const raw    = await callSerper(queryStr)
  const sorted = sortByTier(raw)
  const topTier = sorted.length > 0 ? tierOf(sorted[0]) : null

  return {
    tierUsed: topTier <= 3 ? topTier : null,
    products: sorted.map((item, i) => ({
      nombre_producto: item.title    ?? 'Producto',
      precio_real:     item.price    ?? 'Precio no disponible',
      tienda_nombre:   cleanSource(item.source),
      link_afiliado:   item.link,
      imagen_url:      item.imageUrl ?? null,
      match:           Math.min(98, 72 + Math.max(0, 6 - i)),
      tier:            tierOf(item),
    })),
  }
}

// ── Gemini / classic path ─────────────────────────────────────────────────────

export async function searchProducts(attributes) {
  // Support both new field names (queryBusqueda) and legacy (query_busqueda)
  const queryBase = attributes.queryBusqueda ?? attributes.query_busqueda ?? ''
  const marca     = attributes.marca_visible
  const strategy  = attributes.brand_strategy

  const query = strategy === 'brand_match' && marca
    ? `${marca} ${queryBase}`
    : queryBase

  console.info(`[search] Query natural: "${query}"`)
  const raw    = await callSerper(query)
  const sorted = sortByTier(raw)

  return sorted.map((item, i) => ({
    nombre_producto: item.title    ?? 'Producto',
    precio_real:     item.price    ?? 'Precio no disponible',
    tienda_nombre:   cleanSource(item.source),
    link_afiliado:   item.link,
    imagen_url:      item.imageUrl ?? null,
    match:           scoreMatch(attributes, item, i),
    tier:            tierOf(item),
  }))
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function callSerper(query) {
  const res = await fetch(SERPER_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY':    process.env.SERPER_API_KEY,
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
  const title    = (item.title ?? '').toLowerCase()
  const color    = (attributes.color    ?? attributes.color_principal ?? '').toLowerCase()
  const material = (attributes.material ?? '').toLowerCase()
  const subtipo  = (attributes.subtipo  ?? attributes.tipo ?? '').split(' ')[0].toLowerCase()

  if (color    && title.includes(color))    score += 8
  if (material && title.includes(material)) score += 8
  if (subtipo  && title.includes(subtipo))  score += 8
  score += Math.max(0, 6 - index)
  return Math.min(score, 98)
}
