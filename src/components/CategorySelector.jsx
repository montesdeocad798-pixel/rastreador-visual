import { CATEGORIES } from '../config/storesConfig.js'

function SkirtIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="7" y="3" width="10" height="3" rx="1.5" />
      <path d="M7 6 L4 21 H20 L17 6 Z" />
    </svg>
  )
}

export default function CategorySelector({ image, selected, onSelect, onConfirm, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-10">
      {/* Image preview */}
      <div className="w-24 h-32 rounded-2xl overflow-hidden shadow-lg mb-8 ring-1 ring-slate-100">
        <img src={image} alt="Tu imagen" className="w-full h-full object-cover" />
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
        Paso 2 de 2
      </p>
      <h2 className="text-xl font-medium text-slate-900 mb-1.5 text-center">
        ¿Qué prenda quieres buscar?
      </h2>
      <p className="text-slate-400 text-sm font-light text-center mb-8 max-w-xs">
        El sistema ignorará el entorno y se centrará exclusivamente en la prenda seleccionada.
      </p>

      {/* Category grid */}
      <div className="grid grid-cols-4 gap-3 mb-8 w-full max-w-sm">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`
              flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl
              border transition-all duration-150 text-center
              ${selected === cat.id
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm scale-[1.03]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
              }
            `}
          >
            {cat.emoji
              ? <span className="text-xl leading-none">{cat.emoji}</span>
              : <SkirtIcon />
            }
            <span className="text-[10px] font-medium leading-tight">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2"
        >
          ← Cambiar imagen
        </button>
        <button
          onClick={onConfirm}
          disabled={!selected}
          className={`
            px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
            ${selected
              ? 'bg-slate-900 text-white hover:bg-slate-700 active:scale-[0.98]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          Analizar con IA →
        </button>
      </div>
    </div>
  )
}
