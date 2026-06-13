import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { SearchController } from './controllers/SearchController.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// ── Middleware ──────────────────────────────────────────────────
app.use(express.json())

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Solo se aceptan archivos de imagen.'), false)
  },
})

// ── API Routes ──────────────────────────────────────────────────
app.post('/api/analyze', upload.single('image'), SearchController.analyze)

// ── Servir frontend estático en producción ──────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

// ── Error handler ───────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server] Error no controlado:', err.message)
  res.status(500).json({ error: err.message })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  const mode = process.env.NODE_ENV === 'production' ? 'PRODUCCIÓN' : 'DESARROLLO'
  const keys = process.env.GEMINI_API_KEY && process.env.SERPER_API_KEY ? '✓ API keys configuradas' : '⚠ DEMO MODE (sin API keys)'
  console.log(`[DXMG] Servidor ${mode} en puerto ${PORT} — ${keys}`)
})
