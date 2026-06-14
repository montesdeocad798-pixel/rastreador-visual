/**
 * In-browser image analysis — the photo NEVER leaves the device.
 * Only the extracted JSON attributes are sent to the server.
 *
 * Pipeline:
 *  1. Crop image to category-specific ROI (region of interest)
 *  2. Extract dominant color + palette via hue quantization
 *  3. Analyze texture via Sobel edge density
 *  4. (Optional) TF.js MobileNet for material hints — loads lazily, non-blocking
 */

// ROI vertical slices per category (y0/y1 as fraction of image height)
const ROI = {
  boots:       { y0: 0.45, y1: 1.00 },
  sneakers:    { y0: 0.50, y1: 1.00 },
  bag:         { y0: 0.15, y1: 0.80 },
  jacket:      { y0: 0.05, y1: 0.60 },
  shirt:       { y0: 0.05, y1: 0.55 },
  pants:       { y0: 0.35, y1: 1.00 },
  dress:       { y0: 0.05, y1: 0.95 },
  accessories: { y0: 0.00, y1: 0.60 },
}

// ─── Anonymous persistent user ID ────────────────────────────────────────────

export function getFingerprint() {
  let id = localStorage.getItem('rv_fp')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('rv_fp', id)
  }
  return id
}

// ─── Image loading ────────────────────────────────────────────────────────────

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar la imagen.')) }
    img.src = url
  })
}

// ─── ROI crop ────────────────────────────────────────────────────────────────

function cropToROI(img, roi) {
  const { naturalWidth: W, naturalHeight: H } = img
  const y0px = Math.round(H * roi.y0)
  const y1px = Math.round(H * roi.y1)
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = y1px - y0px
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, -y0px)
  return { canvas, ctx }
}

// ─── Color extraction via hue bucketing ──────────────────────────────────────

function extractColors(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h)
  // 36 hue buckets (0–360 in 10° steps)
  const buckets = Array.from({ length: 36 }, () => ({ n: 0, r: 0, g: 0, b: 0 }))
  let totalR = 0, totalG = 0, totalB = 0, count = 0

  // Sample every 8th pixel (fast enough for mobile)
  for (let py = 0; py < h; py += 8) {
    for (let px = 0; px < w; px += 8) {
      const i  = (py * w + px) * 4
      const r  = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      if (a < 128) continue

      const max  = Math.max(r, g, b)
      const min  = Math.min(r, g, b)
      const diff = max - min
      const hue  = diff === 0 ? 0
        : max === r ? ((g - b) / diff * 60 + 360) % 360
        : max === g ? (b - r) / diff * 60 + 120
        :             (r - g) / diff * 60 + 240
      const bucket = Math.min(35, Math.floor(hue / 10))

      buckets[bucket].n++
      buckets[bucket].r += r
      buckets[bucket].g += g
      buckets[bucket].b += b
      totalR += r; totalG += g; totalB += b; count++
    }
  }

  if (count === 0) return { dominantColor: '#888888', dominantColorName: 'gris', colorPalette: [], brightness: 0.5 }

  const topBuckets = [...buckets]
    .sort((a, b) => b.n - a.n)
    .filter(b => b.n > 0)
    .slice(0, 3)

  const palette = topBuckets.map(b => {
    const r = Math.round(b.r / b.n)
    const g = Math.round(b.g / b.n)
    const bl = Math.round(b.b / b.n)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
  })

  const brightness = (totalR * 0.299 + totalG * 0.587 + totalB * 0.114) / (count * 255)
  const dom = palette[0]

  return {
    dominantColor:     dom,
    dominantColorName: hexToColorName(dom, brightness),
    colorPalette:      palette,
    brightness:        Math.round(brightness * 100) / 100,
  }
}

function hexToColorName(hex, brightness) {
  if (!hex || hex.length < 7) return 'gris'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = brightness ?? (r * 0.299 + g * 0.587 + b * 0.114) / 255

  if (lum < 0.12) return 'negro'
  if (lum > 0.88) return 'blanco'

  const max  = Math.max(r, g, b)
  const min  = Math.min(r, g, b)
  const diff = max - min
  if (diff < 25) return 'gris'

  const hue = max === r ? ((g - b) / diff * 60 + 360) % 360
            : max === g ? (b - r) / diff * 60 + 120
            :             (r - g) / diff * 60 + 240

  const sat = diff / max
  if (sat < 0.2) return 'gris'

  if (hue < 20)  return lum < 0.4 ? 'burdeos' : 'rojo'
  if (hue < 45)  return lum < 0.45 ? 'marrón' : 'naranja'
  if (hue < 70)  return 'amarillo'
  if (hue < 160) return hue < 100 ? 'verde oliva' : 'verde'
  if (hue < 200) return 'turquesa'
  if (hue < 255) return lum < 0.4 ? 'azul marino' : 'azul'
  if (hue < 290) return 'morado'
  if (hue < 330) return 'rosa'
  return lum < 0.4 ? 'burdeos' : 'rojo'
}

// ─── Texture analysis via Sobel edge density ──────────────────────────────────

function analyzeTexture(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h)
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    gray[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255
  }

  let edgeSum = 0, edgeCount = 0
  for (let y = 1; y < h - 1; y += 4) {
    for (let x = 1; x < w - 1; x += 4) {
      const i = y * w + x
      const gx = -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1]
               + gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1]
      const gy = -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1]
               + gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1]
      edgeSum += Math.sqrt(gx * gx + gy * gy)
      edgeCount++
    }
  }

  const edgeDensity = edgeCount > 0 ? edgeSum / edgeCount : 0
  const textureType = edgeDensity > 0.28 ? 'rugoso'
                    : edgeDensity > 0.10 ? 'texturizado'
                    : 'liso'

  return { edgeDensity: Math.round(edgeDensity * 1000) / 1000, textureType }
}

// ─── Optional TF.js enhancement ───────────────────────────────────────────────

async function enhanceWithTFJS(img) {
  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('TF.js timeout')), 10_000))
    const classify = (async () => {
      const [{ default: tf }, mobilenet] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/mobilenet'),
      ])
      const model = await mobilenet.load({ version: 2, alpha: 0.5 })
      const tensor = tf.browser.fromPixels(img).resizeBilinear([224, 224]).expandDims(0)
      const preds = await model.classify(tensor)
      tensor.dispose()
      return preds
    })()

    const preds = await Promise.race([classify, timeout])
    const top = (preds[0]?.className ?? '').toLowerCase()

    if (top.includes('denim') || top.includes('jean'))    return { materialHint: 'denim' }
    if (top.includes('leather'))                           return { materialHint: 'cuero' }
    if (top.includes('fur') || top.includes('fleece'))    return { materialHint: 'pelo' }
    if (top.includes('mesh') || top.includes('lace'))     return { materialHint: 'encaje' }
    return { materialHint: null }
  } catch {
    return {}
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyzes a file in-browser. Returns only a JSON metadata packet — no image data.
 * @param {File} file
 * @param {string} category  — key from CATEGORIES config
 * @param {(msg: string) => void} [onProgress]
 * @returns {Promise<{ fingerprint, processingMs, attributes }>}
 */
export async function analyzeLocally(file, category, onProgress) {
  const t0 = Date.now()

  onProgress?.('Cargando imagen...')
  const img = await loadImage(file)

  const roi = ROI[category] ?? { y0: 0.0, y1: 1.0 }

  onProgress?.('Extrayendo región de interés...')
  const { canvas, ctx } = cropToROI(img, roi)
  const { width: w, height: h } = canvas

  onProgress?.('Analizando colores...')
  const colorData = extractColors(ctx, w, h)

  onProgress?.('Analizando textura...')
  const textureData = analyzeTexture(ctx, w, h)

  onProgress?.('Mejorando con IA local...')
  const tfData = await enhanceWithTFJS(img)

  return {
    fingerprint:   getFingerprint(),
    processingMs:  Date.now() - t0,
    attributes: {
      ...colorData,
      ...textureData,
      ...tfData,
    },
  }
}
