import { useCallback, useState } from 'react'

export default function DropZone({ onUpload }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    (file) => {
      if (file && file.type.startsWith('image/')) onUpload(file)
    },
    [onUpload]
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      handleFile(e.dataTransfer.files[0])
    },
    [handleFile]
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
      <label
        htmlFor="image-upload"
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        className={`
          relative flex flex-col items-center justify-center
          w-full max-w-lg h-72 rounded-3xl cursor-pointer
          border-2 border-dashed transition-all duration-300 select-none
          ${isDragging
            ? 'border-slate-700 bg-slate-100 scale-[1.02] shadow-lg'
            : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm'
          }
        `}
      >
        {/* Upload icon */}
        <div className={`mb-5 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            fill="none"
            className="text-slate-300"
          >
            <rect width="44" height="44" rx="12" fill="currentColor" fillOpacity="0.15" />
            <path
              d="M22 28V18M22 18L17 23M22 18L27 23"
              stroke="#94a3b8"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 32C12.2 30 11 27.2 11 24C11 18.5 15.5 14 21 14C21.3 14 21.6 14 21.9 14.1C23.4 11.5 26.2 9.75 29.5 9.75C34.2 9.75 38 13.55 38 18.25C38 18.5 38 18.75 37.9 19C40.3 20.1 42 22.6 42 25.5C42 28.1 40.7 30.4 38.6 31.8"
              stroke="#cbd5e1"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p className="text-slate-800 font-medium text-base mb-1.5">
          Sube la foto de la prenda que buscas
        </p>
        <p className="text-slate-400 text-sm">
          Arrastra una imagen aquí o{' '}
          <span className="text-slate-600 underline underline-offset-2">selecciona un archivo</span>
        </p>
        <p className="text-slate-300 text-xs mt-4 font-light">PNG · JPG · WEBP — Máx. 10 MB</p>

        <input
          id="image-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      <p className="mt-6 text-slate-400 text-sm text-center max-w-sm leading-relaxed font-light">
        Nuestra IA analiza tejido, color y silueta para encontrar prendas similares
        en las principales tiendas online.
      </p>
    </div>
  )
}
