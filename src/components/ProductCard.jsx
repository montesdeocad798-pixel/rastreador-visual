import { BLOCK_THRESHOLD } from '../hooks/useFeedback'

export default function ProductCard({ product, index, feedbackCount = 0, onFeedback, onConfirm }) {
  const matchStyle =
    product.match >= 95 ? 'text-emerald-600 bg-emerald-50'
    : product.match >= 88 ? 'text-sky-600 bg-sky-50'
    : 'text-slate-500 bg-slate-100'

  const isWarned  = feedbackCount > 0 && feedbackCount < BLOCK_THRESHOLD
  const remaining = BLOCK_THRESHOLD - feedbackCount
  const hasLink   = Boolean(product.linkAfiliado)

  return (
    <article
      className={`
        bg-white rounded-2xl overflow-hidden shadow-sm transition-all duration-300
        hover:shadow-md hover:-translate-y-1 animate-fade-up
        ${isWarned ? 'ring-1 ring-rose-100' : ''}
      `}
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* Image */}
      <div
        className={`relative aspect-[3/4] overflow-hidden bg-slate-100 ${
          !product.inStock ? 'grayscale opacity-60' : ''
        }`}
      >
        <img
          src={product.image}
          alt={product.nombreProducto ?? `${product.store} — prenda similar`}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.04]"
          loading="lazy"
        />
        <span className={`absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${matchStyle}`}>
          {product.match}% match
        </span>
        {!product.inStock && (
          <span className="absolute bottom-2.5 left-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-slate-500">
            Agotado
          </span>
        )}
        {isWarned && (
          <span className="absolute bottom-2.5 right-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-400">
            {remaining} más → bloqueado
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
          {product.store}
        </p>

        {product.nombreProducto && (
          <p className="text-xs text-slate-500 font-light mb-2 line-clamp-2 leading-relaxed">
            {product.nombreProducto}
          </p>
        )}

        <p className="text-xl font-light text-slate-900 tracking-tight mb-3.5">
          {product.price}
        </p>

        {hasLink ? (
          <a
            href={product.linkAfiliado}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block w-full py-2.5 text-center bg-slate-900 text-white text-xs font-medium rounded-xl tracking-wide hover:bg-slate-700 active:scale-[0.98] transition-all duration-200"
          >
            Ver en tienda →
          </a>
        ) : (
          <button
            disabled={!product.inStock}
            className={`w-full py-2.5 text-xs font-medium rounded-xl tracking-wide transition-all duration-200 ${
              product.inStock
                ? 'bg-slate-900 text-white hover:bg-slate-700 active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {product.inStock ? 'Ver en tienda →' : 'No disponible'}
          </button>
        )}

        {/* Feedback row */}
        <div className="flex gap-1.5 mt-2">
          {onConfirm && (
            <button
              onClick={() => onConfirm(product.id, product.store)}
              className="flex-1 py-1.5 text-[10px] rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150"
              title="Confirmar coincidencia — mejora futuras búsquedas"
            >
              ✓ Sí
            </button>
          )}
          <button
            onClick={() => onFeedback(product.id, { store: product.store })}
            className={`flex-1 py-1.5 text-[10px] rounded-lg transition-all duration-150 ${
              feedbackCount > 0
                ? 'text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100'
                : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
            }`}
          >
            {feedbackCount > 0 ? `No (${feedbackCount}×)` : 'No se parece'}
          </button>
        </div>
      </div>
    </article>
  )
}
