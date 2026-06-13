export default function ProductCard({ product, index }) {
  const matchStyle =
    product.match >= 95
      ? 'text-emerald-600 bg-emerald-50'
      : product.match >= 88
      ? 'text-sky-600 bg-sky-50'
      : 'text-slate-500 bg-slate-100'

  return (
    <article
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-fade-up"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* Product image */}
      <div
        className={`relative aspect-[3/4] overflow-hidden bg-slate-100 transition-all duration-300 ${
          !product.inStock ? 'grayscale opacity-60' : ''
        }`}
      >
        <img
          src={product.image}
          alt={`${product.store} — prenda similar`}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.04]"
          loading="lazy"
        />
        <span
          className={`absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${matchStyle}`}
        >
          {product.match}% coincidencia
        </span>
        {!product.inStock && (
          <span className="absolute bottom-2.5 left-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-slate-500">
            Agotado
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
          {product.store}
        </p>
        <p className="text-2xl font-light text-slate-900 tracking-tight mb-3.5">
          {product.price}
        </p>
        <button
          disabled={!product.inStock}
          className={`
            w-full py-2.5 text-xs font-medium rounded-xl tracking-wide transition-all duration-200
            ${product.inStock
              ? 'bg-slate-900 text-white hover:bg-slate-700 active:scale-[0.98]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {product.inStock ? 'Ver en tienda →' : 'No disponible'}
        </button>
      </div>
    </article>
  )
}
