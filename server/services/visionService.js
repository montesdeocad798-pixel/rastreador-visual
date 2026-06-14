import { GoogleGenerativeAI } from '@google/generative-ai'

// Orden de modelos por preferencia.
// El SDK llama a la API v1beta; gemini-2.0-flash requiere plan de pago.
// gemini-1.5-flash-8b y gemini-1.5-flash están disponibles en el plan gratuito.
const MODEL_PRIORITY = [
  'gemini-1.5-flash-8b',   // free tier — rápido, soporta visión
  'gemini-1.5-flash',      // free tier — más preciso
  'gemini-2.0-flash',      // pay-as-you-go
]

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * Analiza una imagen usando Gemini Vision con el prompt ROI dado.
 * Prueba los modelos en orden hasta que uno responda correctamente.
 */
export async function analyzeImageWithROI(imageBuffer, mimeType, roiPrompt) {
  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType,
    },
  }

  let lastError
  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent([roiPrompt, imagePart])
      const text = result.response.text().trim()

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error(`JSON no encontrado en respuesta de ${modelName}: ${text.slice(0, 200)}`)
      }

      const attributes = JSON.parse(jsonMatch[0])

      if (!attributes.marca_visible || attributes.marca_visible === 'null') {
        attributes.marca_visible = null
      }

      console.info(`[visionService] Análisis OK con modelo: ${modelName}`)
      return attributes
    } catch (err) {
      const is404   = err.message?.includes('404')
      const is429   = err.message?.includes('429')
      const isQuota = err.message?.includes('quota') || err.message?.includes('Quota')

      if (is404 || is429 || isQuota) {
        console.warn(`[visionService] ${modelName} no disponible (${is404 ? '404' : '429/quota'}), probando siguiente...`)
        lastError = err
        continue
      }

      // Error distinto (red, JSON inválido, etc.) → propagar inmediatamente
      throw err
    }
  }

  throw new Error(
    `Ningún modelo Gemini disponible para tu plan. Último error: ${lastError?.message?.slice(0, 300)}`
  )
}
