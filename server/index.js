import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { SearchController } from './controllers/SearchController.js'
import { LearnController } from './controllers/LearnController.js'
import { runMigrations } from './services/postgresService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// ── Middleware ──────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))

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
// Classic path: image → Gemini Vision → Serper search
app.post('/api/analyze', upload.single('image'), SearchController.analyze)

// Hybrid path: browser extracts attributes locally, sends only JSON
app.post('/api/analyze-local', LearnController.analyzeLocal)
app.post('/api/feedback',      LearnController.feedback)
app.get('/api/config',         LearnController.getConfig)

// ── Servir frontend estático en producción ──────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  // Express 5 requires named wildcard params — use regex for SPA fallback
  app.get(/(.*)/, (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

// ── Error handler ───────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server] Error no controlado:', err.message)
  res.status(500).json({ error: err.message })
})

const PORT = process.env.PORT || 3001

// Run DB migrations then start listening
runMigrations()
  .catch(err => console.error('[DB] Migration error (non-fatal):', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      const mode = process.env.NODE_ENV === 'production' ? 'PRODUCCIÓN' : 'DESARROLLO'
      const keys = process.env.GEMINI_API_KEY && process.env.SERPER_API_KEY
        ? '✓ API keys configuradas'
        : '⚠ DEMO MODE (sin API keys)'
      const db = process.env.DATABASE_URL ? '✓ PostgreSQL conectado' : '⚠ sin DB'
      console.log(`[DXMG] Servidor ${mode} en puerto ${PORT} — ${keys} — ${db}`)
    })
  })
