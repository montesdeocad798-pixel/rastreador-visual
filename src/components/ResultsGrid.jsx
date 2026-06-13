import { useState } from 'react'
import ProductCard from './ProductCard'
import FilterBar from './FilterBar'
import { mockProducts } from '../data/mockProducts'

export default function ResultsGrid({ image, onReset }) {
  const [selectedSize, setSelectedSize] = useState(35)
  const [maxPrice, setMaxPrice] = useState(Infinity)
  const [onlyInStock, setOnlyInStock] = useState(false)

  const filtered = mockProducts.filter((p) => {
    if (selectedSize !== null && !p.sizes.includes(selectedSize)) return false
    if (p.priceValue > maxPrice) return false
    if (onlyInStock && !p.inStock) return false
    return true
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-16 rounded-xl overflow-hidden shadow-md flex-shrink-0 ring-1 ring-slate-100">
            <img src={image} alt="Tu prenda" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-slate-900">
              {filtered.length}{' '}
              {filtered.length === mockProducts.length
                ? 'resultados encontrados'
                : `de ${mockProducts.length} resultados`}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5 font-light">
              Ordenados por coincidencia · IA visual
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

      {/* Filter bar */}
      <FilterBar
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
        onlyInStock={onlyInStock}
        onToggleStock={setOnlyInStock}
      />

      {/* Divider */}
      <div className="h-px bg-slate-100 mb-8" />

      {/* Products grid or empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-slate-400 text-sm font-light">
            Ningún resultado con estos filtros.
          </p>
          <button
            onClick={() => {
              setSelectedSize(null)
              setMaxPrice(Infinity)
              setOnlyInStock(false)
            }}
            className="mt-3 text-xs text-slate-600 underline underline-offset-2 hover:text-slate-900 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
