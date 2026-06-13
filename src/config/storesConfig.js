/**
 * Jerarquía de tiendas por Tier.
 *
 * Tier 1 — flagship: alta conversión, buena calidad de imagen, indexación fiable.
 * Tier 2 — marketplaces premium: más catálogo, mayor latencia de índice.
 * Tier 3 — long tail: máximo catálogo, menor precisión visual.
 *
 * El motor lanza peticiones empezando por Tier 1. Si obtiene menos de
 * MIN_RESULTS coincidencias, escala al siguiente tier.
 */

export const MIN_RESULTS = 2

// Definido aquí para que sea importable tanto por el frontend como por el servidor.
export const CATEGORIES = [
  { id: 'boots',       label: 'Botas',       emoji: '👢', roi: 'calzado tipo botas o botines' },
  { id: 'sneakers',    label: 'Zapatillas',   emoji: '👟', roi: 'zapatillas o calzado deportivo' },
  { id: 'bag',         label: 'Bolso',        emoji: '👜', roi: 'bolso, cartera o mochila' },
  { id: 'jacket',      label: 'Chaqueta',     emoji: '🧥', roi: 'chaqueta, abrigo o cazadora' },
  { id: 'shirt',       label: 'Camisa/Top',   emoji: '👕', roi: 'camisa, camiseta o top' },
  { id: 'pants',       label: 'Pantalón',     emoji: '👖', roi: 'pantalón, jeans o leggins' },
  { id: 'dress',       label: 'Vestido',      emoji: '👗', roi: 'vestido o falda' },
  { id: 'accessories', label: 'Accesorios',   emoji: '💍', roi: 'accesorio, joyería, cinturón o gafas' },
]

export const STORE_TIERS = {
  1: [
    { id: 'zara',    name: 'Zara',    domain: 'zara.com',    region: 'es' },
    { id: 'asos',    name: 'ASOS',    domain: 'asos.com',    region: 'global' },
    { id: 'hm',      name: 'H&M',     domain: 'hm.com',      region: 'es' },
    { id: 'mango',   name: 'Mango',   domain: 'mango.com',   region: 'es' },
  ],
  2: [
    { id: 'zalando', name: 'Zalando', domain: 'zalando.es',  region: 'es' },
    { id: 'elcorteingles', name: 'El Corte Inglés', domain: 'elcorteingles.es', region: 'es' },
    { id: 'stradivarius', name: 'Stradivarius', domain: 'stradivarius.com', region: 'es' },
  ],
  3: [
    { id: 'amazon',  name: 'Amazon',  domain: 'amazon.es',   region: 'es' },
    { id: 'shein',   name: 'SHEIN',   domain: 'shein.com',   region: 'global' },
    { id: 'primark', name: 'Primark', domain: 'primark.com', region: 'es' },
  ],
}

export const TIERS_ORDERED = [1, 2, 3]

/**
 * Genera el parámetro `siteSearch` para Google Custom Search API
 * o el operador inline site: para la query.
 *
 * Uso con Google CSE:
 *   GET https://customsearch.googleapis.com/customsearch/v1
 *     ?key=API_KEY
 *     &cx=SEARCH_ENGINE_ID
 *     &q=botas+cuero+mujer+{buildSiteFilter([1])}
 *
 * Alternativa con SerpAPI / Serper.dev (más barato):
 *   POST https://google.serper.dev/search
 *     { q: "botas cuero", sites: getDomainsForTier([1]) }
 */
export function buildSiteFilter(tiers = [1]) {
  return tiers
    .flatMap(t => (STORE_TIERS[t] || []).map(s => `site:${s.domain}`))
    .join(' OR ')
}

export function getDomainsForTier(tiers = [1]) {
  return tiers.flatMap(t => (STORE_TIERS[t] || []).map(s => s.domain))
}

/**
 * Motor de búsqueda en cascada por tiers.
 *
 * `searchFn(query, tier)` → Promise<result[]>
 * Se escala al siguiente tier si results.length < MIN_RESULTS.
 *
 * En producción:
 *   const results = await searchWithTierCascade(
 *     'botas cowboy marrón',
 *     (siteQuery, tier) => callGoogleCSE(siteQuery)
 *   )
 */
export async function searchWithTierCascade(baseQuery, searchFn) {
  for (const tier of TIERS_ORDERED) {
    const siteFilter = buildSiteFilter([tier])
    const query = `${baseQuery} (${siteFilter})`
    const results = await searchFn(query, tier)

    if (results.length >= MIN_RESULTS) {
      return { results, tier, escalated: tier > 1 }
    }

    console.info(`[DXMG] Tier ${tier} insuficiente (${results.length} resultados), escalando...`)
  }

  return { results: [], tier: null, escalated: true }
}
