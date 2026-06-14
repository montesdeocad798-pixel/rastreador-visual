import { CATEGORIES } from '../../src/config/storesConfig.js'

export { CATEGORIES }

export function buildROIPrompt(categoryId) {
  const cat = CATEGORIES.find(c => c.id === categoryId)
  const roi = cat?.roi ?? 'prenda principal de moda'

  return `Eres un motor de análisis visual especializado en moda y e-commerce.

OBJETIVO: Analiza ÚNICAMENTE el/la ${roi} visible en esta imagen.
IGNORA completamente: fondo, persona, piel, cabello, entorno y cualquier prenda que no sea ${roi}.

Devuelve un objeto JSON con estos campos exactos:

- categoria: una de estas IDs exactas según lo que ves → boots, sneakers, bag, jacket, shirt, pants, skirt, dress, accessories
- subtipo: descripción corta del tipo de prenda (ej: "bota cowboy de caña alta", "blazer cruzado oversize")
- color: color dominante en español, tan específico como puedas (ej: "marrón tostado", "azul marino", "blanco roto")
- material: material principal estimado (ej: "cuero liso", "denim desgastado", "punto acanalado", "nylon acolchado")
- silueta: forma, corte y proporciones (ej: "caña alta, puntera en punta, suela plana", "talle alto, pernera ancha y recta")
- detalles: array de 2-4 detalles visuales distintivos (ej: ["costuras decorativas en contraste", "hebilla dorada lateral"])
- queryBusqueda: frase de búsqueda de 5-8 palabras con las mismas palabras que usaría un título de producto real en Zara, ASOS o Zalando. Incluye categoría, color, material y rasgo más distintivo. Añade el género si es claro. Ejemplos de buen formato: "botas cowboy caña alta cuero marrón mujer", "blazer oversize cuadros príncipe de gales mujer", "bolso shopper piel negro asa larga"
- marca_visible: nombre de la marca si aparece en logo o etiqueta visible; si no hay ninguna escribe null

Reglas críticas:
- Si NO ves ninguna marca, escribe null en marca_visible. No asumas ninguna marca por el estilo.
- queryBusqueda debe sonar a título de producto de tienda online, no a descripción literaria.
- Responde ÚNICAMENTE con el JSON. Sin explicaciones, sin texto adicional.`
}
