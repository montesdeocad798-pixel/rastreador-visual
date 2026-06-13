import { CATEGORIES } from '../../src/config/storesConfig.js'

export { CATEGORIES }

/**
 * Construye el prompt de visión con enfoque ROI basado en la categoría.
 * Instruye a Gemini a ignorar todo excepto la prenda objetivo.
 */
export function buildROIPrompt(categoryId) {
  const cat = CATEGORIES.find(c => c.id === categoryId)
  const roi = cat?.roi ?? 'prenda principal de moda'

  return `Eres un motor de análisis visual especializado en moda y e-commerce.

OBJETIVO: Analiza ÚNICAMENTE el/la ${roi} visible en esta imagen.
IGNORA completamente: fondo, persona, piel, cabello, entorno, accesorios no relevantes y cualquier otra prenda que no sea ${roi}.

Extrae los siguientes atributos con la máxima precisión posible y devuelve SOLO el JSON (sin texto adicional):

{
  "tipo": "descripción concisa del tipo de prenda (ej: 'bota cowboy de caña alta')",
  "color_principal": "color dominante en español",
  "colores_secundarios": ["color1"],
  "material": "material estimado (cuero, ante, tela, sintético, punto, denim, etc.)",
  "patron": "liso / rayas / cuadros / animal print / floral / tie-dye",
  "silueta": "descripción de la forma y corte",
  "detalles_clave": ["detalle visual más distintivo 1", "detalle 2", "detalle 3"],
  "marca_visible": "nombre de la marca si aparece visible en logo o etiqueta, si no hay ninguna escribe null",
  "genero_estimado": "mujer / hombre / unisex",
  "temporada_estimada": "primavera-verano / otoño-invierno / todo el año",
  "query_busqueda": "frase de búsqueda SEO de 5-8 palabras para shopping online, solo atributos visuales únicos"
}

Reglas críticas:
- Si NO ves ninguna marca, escribe null en marca_visible. NO ASUMAS ninguna marca.
- La query_busqueda debe ser concisa y específica para una búsqueda de shopping real.
- Responde ÚNICAMENTE con el JSON, sin explicaciones adicionales.`
}
