import { useState, useCallback } from 'react'
import DropZone from './components/DropZone'
import CategorySelector from './components/CategorySelector'
import ScanAnimation from './components/ScanAnimation'
import ResultsGrid from './components/ResultsGrid'
import './index.css'

// stages: 'idle' | 'category' | 'scanning' | 'results' | 'error'

export default function App() {
  const [stage, setStage] = useState('idle')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [imageUrl, setImageUrl]         = useState(null)
  const [category, setCategory]         = useState(null)
  const [products, setProducts]         = useState([])
  const [attributes, setAttributes]     = useState(null)
  const [isDemo, setIsDemo]             = useState(false)
  const [error, setError]               = useState(null)

  const handleImageUpload = useCallback((file) => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setUploadedFile(file)
    setImageUrl(URL.createObjectURL(file))
    setCategory(null)
    setStage('category')
  }, [imageUrl])

  const handleAnalyze = useCallback(async () => {
    if (!uploadedFile || !category) return
    setStage('scanning')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', uploadedFile)
      formData.append('category', category)

      const res = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)

      setProducts(data.products ?? [])
      setAttributes(data.attributes ?? null)
      setIsDemo(data.demo ?? false)
      setStage('results')
    } catch (err) {
      setError(err.message)
      setStage('error')
    }
  }, [uploadedFile, category])

  const handleReset = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setUploadedFile(null)
    setImageUrl(null)
    setCategory(null)
    setProducts([])
    setAttributes(null)
    setError(null)
    setStage('idle')
  }, [imageUrl])

  const statusBadge = {
    scanning: { text: 'Procesando...', cls: 'text-cyan-600 bg-cyan-50 animate-pulse' },
    results:  { text: isDemo ? 'Demo · Modo sin API' : 'Análisis completado', cls: isDemo ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50' },
    error:    { text: 'Error en análisis', cls: 'text-rose-600 bg-rose-50' },
  }[stage]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-10">
        <button onClick={stage !== 'idle' ? handleReset : undefined} className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">R</span>
          </div>
          <span className="text-slate-900 text-sm font-medium tracking-[0.06em] uppercase">
            Rastreador Visual
          </span>
        </button>

        <div className="flex items-center gap-3">
          {statusBadge && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge.cls}`}>
              {statusBadge.text}
            </span>
          )}
          <span className="text-xs text-slate-300 hidden sm:block font-light">Moda · IA Visual</span>
        </div>
      </header>

      {/* State machine */}
      <main>
        {stage === 'idle' && (
          <DropZone onUpload={handleImageUpload} />
        )}

        {stage === 'category' && (
          <CategorySelector
            image={imageUrl}
            selected={category}
            onSelect={setCategory}
            onConfirm={handleAnalyze}
            onBack={handleReset}
          />
        )}

        {stage === 'scanning' && (
          <ScanAnimation image={imageUrl} category={category} />
        )}

        {stage === 'results' && (
          <ResultsGrid
            image={imageUrl}
            products={products}
            attributes={attributes}
            isDemo={isDemo}
            onReset={handleReset}
          />
        )}

        {stage === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 text-center">
            <p className="text-slate-800 font-medium mb-1">No se pudo completar el análisis</p>
            <p className="text-slate-400 text-sm font-light mb-6 max-w-sm">{error}</p>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-slate-900 text-white text-sm rounded-xl hover:bg-slate-700 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
