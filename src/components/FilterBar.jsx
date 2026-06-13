const SIZES = [35, 36, 37, 38, 39]

const PRICE_OPTIONS = [
  { label: 'Cualquier precio', value: Infinity },
  { label: 'Hasta € 30', value: 30 },
  { label: 'Hasta € 50', value: 50 },
  { label: 'Hasta € 70', value: 70 },
]

export default function FilterBar({
  selectedSize,
  onSizeChange,
  maxPrice,
  onMaxPriceChange,
  onlyInStock,
  onToggleStock,
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 py-4">
      {/* ── Talla ── */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Talla
        </span>
        <div className="flex gap-1.5">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => onSizeChange(selectedSize === size ? null : size)}
              className={`
                w-9 h-7 rounded-full text-xs font-medium transition-all duration-150
                ${selectedSize === size
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400 hover:text-slate-800'
                }
              `}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="hidden sm:block h-4 w-px bg-slate-200" />

      {/* ── Precio máximo ── */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Precio
        </span>
        <div className="relative">
          <select
            value={maxPrice === Infinity ? 'Infinity' : maxPrice}
            onChange={(e) =>
              onMaxPriceChange(
                e.target.value === 'Infinity' ? Infinity : Number(e.target.value)
              )
            }
            className="
              appearance-none text-xs text-slate-700 bg-white
              border border-slate-200 rounded-full
              pl-3 pr-7 py-1.5
              hover:border-slate-400 transition-colors duration-150
              focus:outline-none focus:border-slate-500
              cursor-pointer
            "
          >
            {PRICE_OPTIONS.map((opt) => (
              <option
                key={String(opt.value)}
                value={opt.value === Infinity ? 'Infinity' : opt.value}
              >
                {opt.label}
              </option>
            ))}
          </select>
          {/* Custom chevron */}
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg width="9" height="5" viewBox="0 0 9 5" fill="none">
              <path
                d="M1 1L4.5 4.5L8 1"
                stroke="#94a3b8"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="hidden sm:block h-4 w-px bg-slate-200" />

      {/* ── Toggle stock ── */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-slate-600 font-light select-none">
          Solo artículos en stock
        </span>
        <button
          role="switch"
          aria-checked={onlyInStock}
          onClick={() => onToggleStock(!onlyInStock)}
          className={`
            relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0
            ${onlyInStock ? 'bg-slate-900' : 'bg-slate-200'}
          `}
        >
          <span
            className={`
              absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm
              transition-transform duration-200
              ${onlyInStock ? 'translate-x-4' : 'translate-x-0'}
            `}
          />
        </button>
      </div>
    </div>
  )
}
