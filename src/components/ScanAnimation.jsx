const STEPS = [
  { delay: 0, text: 'Detectando silueta y tejido...' },
  { delay: 0.9, text: 'Analizando patrón y color...' },
  { delay: 1.8, text: 'Buscando coincidencias en la web...' },
]

export default function ScanAnimation({ image }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
      {/* Image with scan effect */}
      <div className="relative w-56 h-72 rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-100">
        <img
          src={image}
          alt="Prenda a analizar"
          className="w-full h-full object-cover"
        />

        {/* Dark vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />

        {/* Animated scan line */}
        <div
          className="absolute left-0 w-full h-[2px] animate-scan-line"
          style={{
            background: 'rgba(34,211,238,0.95)',
            boxShadow:
              '0 0 18px 5px rgba(34,211,238,0.6), 0 0 6px 2px rgba(34,211,238,1)',
          }}
        />

        {/* Corner brackets — top */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-[1.5px] border-l-[1.5px] border-cyan-400" />
        <div className="absolute top-3 right-3 w-5 h-5 border-t-[1.5px] border-r-[1.5px] border-cyan-400" />
        {/* Corner brackets — bottom */}
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-[1.5px] border-l-[1.5px] border-cyan-400" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-[1.5px] border-r-[1.5px] border-cyan-400" />
      </div>

      {/* Status text */}
      <div className="mt-8 text-center">
        <div className="space-y-1.5">
          {STEPS.map(({ delay, text }) => (
            <p
              key={text}
              className="text-slate-500 text-sm font-light animate-fade-up"
              style={{ animationDelay: `${delay}s` }}
            >
              {text}
            </p>
          ))}
        </div>

        {/* Pulsing dots */}
        <div className="flex justify-center gap-1.5 mt-5">
          {[0, 0.15, 0.3].map((delay, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
