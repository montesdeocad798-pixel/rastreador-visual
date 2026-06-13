import { useState, useCallback } from 'react'
import DropZone from './components/DropZone'
import ScanAnimation from './components/ScanAnimation'
import ResultsGrid from './components/ResultsGrid'
import './index.css'

const SCAN_DURATION_MS = 3000

export default function App() {
  const [stage, setStage] = useState('idle') // 'idle' | 'scanning' | 'results'
  const [uploadedImage, setUploadedImage] = useState(null)

  const handleImageUpload = useCallback((file) => {
    const url = URL.createObjectURL(file)
    setUploadedImage(url)
    setStage('scanning')
    setTimeout(() => setStage('results'), SCAN_DURATION_MS)
  }, [])

  const handleReset = useCallback(() => {
    if (uploadedImage) URL.revokeObjectURL(uploadedImage)
    setUploadedImage(null)
    setStage('idle')
  }, [uploadedImage])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-10">
        <button
          onClick={stage !== 'idle' ? handleReset : undefined}
          className="flex items-center gap-2.5"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">R</span>
          </div>
          <span className="text-slate-900 text-sm font-medium tracking-[0.06em] uppercase">
            Rastreador Visual
          </span>
        </button>

        <div className="flex items-center gap-3">
          {stage === 'results' && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
              Análisis completado
            </span>
          )}
          {stage === 'scanning' && (
            <span className="text-xs text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full font-medium animate-pulse">
              Procesando...
            </span>
          )}
          <span className="text-xs text-slate-300 hidden sm:block font-light">
            Moda · IA Visual
          </span>
        </div>
      </header>

      {/* Main content — state-driven */}
      <main>
        {stage === 'idle' && <DropZone onUpload={handleImageUpload} />}
        {stage === 'scanning' && <ScanAnimation image={uploadedImage} />}
        {stage === 'results' && (
          <ResultsGrid image={uploadedImage} onReset={handleReset} />
        )}
      </main>
    </div>
  )
}
