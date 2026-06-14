import { GoogleGenerativeAI } from '@google/generative-ai'

// El SDK @google/generative-ai usa /v1beta/ por defecto.
// Los modelos gemini-1.5-* fueron migrados a /v1/ (API estable).
// Sin apiVersion:'v1', todos devuelven 404 aunque la key sea válida.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
  apiVersion: 'v1',
})

const MODEL_PRIORITY = [
  'gemini-1.5-flash-8b',  // free tier — rápido, visión OK
  'gemini-1.5-flash',     // free tier — más preciso
  'gemini-2.0-flash',     // pay-as-you-go (por si tienen billing)
]

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

      console.info(`[visionService] OK con modelo: ${modelName}`)
      return attributes
    } catch (err) {
      const status = err.message?.match(/\[(\d{3})/)?.[1]
      if (['404', '429', '503'].includes(status)) {
        console.warn(`[visionService] ${modelName} → ${status}, probando siguiente...`)
        lastError = err
        continue
      }
      throw err
    }
  }

  throw new Error(
    `Sin modelos Gemini disponibles. Último error: ${lastError?.message?.slice(0, 300)}`
  )
}
