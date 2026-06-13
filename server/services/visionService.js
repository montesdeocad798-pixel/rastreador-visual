import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * Analiza una imagen usando Gemini Vision con el prompt ROI dado.
 * Devuelve los atributos visuales de la prenda como objeto JSON.
 */
export async function analyzeImageWithROI(imageBuffer, mimeType, roiPrompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType,
    },
  }

  const result = await model.generateContent([roiPrompt, imagePart])
  const text = result.response.text().trim()

  // Extrae el bloque JSON aunque venga con texto alrededor
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Gemini no devolvió JSON válido. Respuesta: ${text.slice(0, 200)}`)
  }

  const attributes = JSON.parse(jsonMatch[0])

  // Normalizar marca_visible — null si es cadena vacía o "null"
  if (!attributes.marca_visible || attributes.marca_visible === 'null') {
    attributes.marca_visible = null
  }

  return attributes
}
