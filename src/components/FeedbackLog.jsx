import { useState } from 'react'
import { BLOCK_THRESHOLD } from '../hooks/useFeedback'

export default function FeedbackLog({ blockedEntries, onRestore, onClearAll }) {
  const [open, setOpen] = useState(false)

  if (blockedEntries.length === 0) return null

  return (
    <div className="mt-10 border border-slate-100 rounded-2xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span className="text-xs font-medium text-slate-600">
            Falsos positivos bloqueados
          </span>
          <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
            {blockedEntries.length}
          </span>
        </div>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 py-4 bg-white">
          <p className="text-[10px] text-slate-400 mb-3 font-light">
            Bloqueados tras {BLOCK_THRESHOLD} rechazos. No aparecerán en búsquedas futuras en este dispositivo.
          </p>

          <ul className="space-y-2">
            {blockedEntries.map(([id, entry]) => (
              <li key={id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    {entry.store || `Producto #${id}`}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    · rechazado {entry.count}×
                  </span>
                  {entry.blockedAt && (
                    <span className="text-[10px] text-slate-300">
                      · {new Date(entry.blockedAt).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onRestore(id)}
                  className="text-[10px] text-slate-400 hover:text-slate-700 underline underline-offset-2 transition-colors"
                >
                  Restaurar
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={onClearAll}
            className="mt-4 text-[10px] text-rose-400 hover:text-rose-600 transition-colors underline underline-offset-2"
          >
            Limpiar todo el historial
          </button>
        </div>
      )}
    </div>
  )
}
