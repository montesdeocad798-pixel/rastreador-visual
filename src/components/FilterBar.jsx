// header is h-16 (64 px) → sticky top-16 places FilterBar directly below it
const SIZES = [35, 36, 37, 38, 39]

const PRICE_OPTIONS = [
  { label: 'Cualquier precio', value: Infinity },
  { label: 'Hasta € 30',       value: 30 },
  { label: 'Hasta € 50',       value: 50 },
  { label: 'Hasta € 70',       value: 70 },
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
    // Sticky strip — sits 64 px below the app header (h-16 = top-16)
    // -mx-4 px-4 cancels the parent's horizontal padding so the bg spans full width
    <div className="sticky top-16 z-10 bg-white border-b border-slate-100 -mx-4 px-4">
      {/* Horizontal scroll on mobile, wraps on sm+ */}
      <div className="overflow-x-auto">
        <div className="flex items-center gap-x-5 gap-y-2 py-2.5 min-w-max sm:min-w-0 sm:flex-wrap">

          {/* ── Talla ─────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">
              Talla
            </span>
            <div className="flex gap-1.5">
              {SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => onSizeChange(selectedSize === size ? null : size)}
                  // min-h-[44px] min-w-[44px] satisfies mobile touch-target guidelines
                  className={`
                    min-h-[44px] min-w-[44px] px-2 rounded-xl text-sm font-medium
                    transition-all duration-150 flex items-center justify-center
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
          <div className="hidden sm:block h-5 w-px bg-slate-200 flex-shrink-0" />

          {/* ── Precio máximo ──────────────────────────────── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">
              Precio
            </span>
            <div className="relative">
              <select
                value={maxPrice === Infinity ? 'Infinity' : maxPrice}
                onChange={(e) =>
                  onMaxPriceChange(e.target.value === 'Infinity' ? Infinity : Number(e.target.value))
                }
                // min-h-[44px] for touch target
                className="
                  appearance-none text-xs text-slate-700 bg-white
                  border border-slate-200 rounded-xl
                  pl-3 pr-7 min-h-[44px]
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
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                <svg width="9" height="5" viewBox="0 0 9 5" fill="none">
                  <path d="M1 1L4.5 4.5L8 1" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>

          {/* Separator */}
          <div className="hidden sm:block h-5 w-px bg-slate-200 flex-shrink-0" />

          {/* ── Solo en stock ──────────────────────────────── */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-xs text-slate-600 font-light select-none whitespace-nowrap">
              Solo en stock
            </span>
            {/* Touch-friendly toggle — tap area via min-h-[44px] on label wrapper */}
            <button
              role="switch"
              aria-checked={onlyInStock}
              onClick={() => onToggleStock(!onlyInStock)}
              className={`
                relative w-10 h-6 rounded-full transition-colors duration-200
                focus:outline-none flex-shrink-0
                ${onlyInStock ? 'bg-slate-900' : 'bg-slate-200'}
              `}
            >
              <span
                className={`
                  absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm
                  transition-transform duration-200
                  ${onlyInStock ? 'translate-x-4' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
