import { useState, useCallback } from 'react'
import ProductCard from './ProductCard'
import FilterBar from './FilterBar'
import FeedbackLog from './FeedbackLog'
import { useFeedback } from '../hooks/useFeedback'

function parsePrice(str) {
  return parseFloat((str ?? '0').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
}

function normalizeProduct(p, index) {
  return {
    id:             p.id ?? `r${index}`,
    store:          p.tienda_nombre ?? p.store ?? 'Tienda',
    price:          p.precio_real   ?? p.price ?? '—',
    priceValue:     parsePrice(p.precio_real ?? p.price),
    match:          p.match         ?? 0,
    image:          p.imagen_url    ?? p.image ?? `https://picsum.photos/seed/p${index}/300/400`,
    sizes:          p.sizes         ?? [],
    inStock:        p.inStock       ?? true,
    linkAfiliado:   p.link_afiliado ?? null,
    nombreProducto: p.nombre_producto ?? null,
  }
}

// Render attributes panel for both Gemini-format and browser-extracted-format
function AttributeChips({ attributes }) {
  if (!attributes) return null

  // Gemini format
  const isGemini = 'tipo' in attributes || 'color_principal' in attributes
  const chips = isGemini
    ? [
        ['Tipo',      attributes.tipo],
        ['Color',     attributes.color_principal],
        ['Material',  attributes.material],
        ['Marca',     attributes.marca_visible ?? 'No identificada'],
        ['Estrategia', attributes.brand_strategy === 'brand_match' ? 'Por marca' : 'Visual'],
      ]
    : [
        ['Color',    attributes.dominantColorName],
        ['Textura',  attributes.textureType],
        ['Material', attributes.materialHint ?? 'Sin datos'],
        ['Brillo',   attributes.brightness != null ? `${Math.round(attributes.brightness * 100)}%` : '—'],
        ['Origen',   'Análisis local'],
      ]

  return (
    <div className="mb-6 px-4 py-3 bg-white border border-slate-100 rounded-xl flex flex-wrap gap-x-4 gap-y-1.5">
      {chips.map(([k, v]) => v && (
        <div key={k} className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{k}</span>
          <span className="text-xs font-light text-slate-700">{v}</span>
        </div>
      ))}
    </div>
  )
}

export default function ResultsGrid({
  image, products = [], attributes, isDemo, onReset,
  sessionId, fingerprint, category,
}) {
  const [selectedSize, setSelectedSize] = useState(null)
  const [maxPrice, setMaxPrice]         = useState(Infinity)
  const [onlyInStock, setOnlyInStock]   = useState(false)

  const { report, restore, clearAll, getCount, isBlocked, blockedEntries } = useFeedback()

  const normalized = products.map(normalizeProduct)
  const filtered   = normalized.filter((p) => {
    if (isBlocked(p.id)) return false
    if (selectedSize && p.sizes.length > 0 && !p.sizes.includes(selectedSize)) return false
    if (p.priceValue > 0 && p.priceValue > maxPrice) return false
    if (onlyInStock && !p.inStock) return false
    return true
  })
  const totalHidden = normalized.length - filtered.length

  // Fires server-side feedback and optionally blocks the product locally
  const sendFeedbackToServer = useCallback((productId, storeName, confirmed) => {
    if (!sessionId && !fingerprint) return
    fetch('/api/feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        productId,
        storeName,
        confirmed,
        fingerprint,
        category,
        attributes,
      }),
    }).catch(() => {}) // fire-and-forget — never block the UI
  }, [sessionId, fingerprint, category, attributes])

  const handleNegativeFeedback = useCallback((productId, meta) => {
    report(productId, meta)
    sendFeedbackToServer(productId, meta?.store ?? '', false)
  }, [report, sendFeedbackToServer])

  const handlePositiveFeedback = useCallback((productId, storeName) => {
    sendFeedbackToServer(productId, storeName, true)
  }, [sendFeedbackToServer])

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Demo notice */}
      {isDemo && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
          <span className="text-amber-500 text-sm mt-0.5">⚠</span>
          <div>
            <p className="text-xs font-medium text-amber-700">Modo demo activo</p>
            <p className="text-xs text-amber-600 font-light mt-0.5">
              Configura <code className="bg-amber-100 px-1 rounded">SERPER_API_KEY</code> en Railway para resultados reales.
            </p>
          </div>
        </div>
      )}

      <AttributeChips attributes={attributes} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-16 rounded-xl overflow-hidden shadow-md flex-shrink-0 ring-1 ring-slate-100">
            <img src={image} alt="Tu prenda" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-slate-900">
              {filtered.length}{totalHidden > 0 ? ` de ${normalized.length} resultados` : ' resultados encontrados'}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5 font-light">
              Ordenados por coincidencia · análisis en dispositivo
              {totalHidden > 0 && <span className="text-rose-300 ml-1.5">· {totalHidden} ocultos</span>}
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2 font-light"
        >
          Nueva búsqueda
        </button>
      </div>

      <FilterBar
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
        onlyInStock={onlyInStock}
        onToggleStock={setOnlyInStock}
      />

      <div className="h-px bg-slate-100 mb-8" />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-slate-400 text-sm font-light">Ningún resultado con estos filtros.</p>
          <button
            onClick={() => { setSelectedSize(null); setMaxPrice(Infinity); setOnlyInStock(false) }}
            className="mt-3 text-xs text-slate-600 underline underline-offset-2 hover:text-slate-900 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i}
              feedbackCount={getCount(product.id)}
              onFeedback={handleNegativeFeedback}
              onConfirm={handlePositiveFeedback}
            />
          ))}
        </div>
      )}

      <FeedbackLog blockedEntries={blockedEntries} onRestore={restore} onClearAll={clearAll} />
    </div>
  )
}
