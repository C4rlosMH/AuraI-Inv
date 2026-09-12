const rawKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_KEY = rawKey.trim();

const VALID_CATEGORIES = [
  "Alimentación",
  "Transporte",
  "Salud",
  "Ocio y Entretenimiento",
  "Servicios y Tecnología",
  "Compras y Misceláneos",
  "Cargos Financieros"
];

export const categorizeTransaction = async (concept: string): Promise<string | null> => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) return null;
  if (concept.trim().length < 3) return null;

  const prompt = `Actúa como un analista financiero. Clasifica el siguiente gasto en UNA de estas categorías exactas:
${VALID_CATEGORIES.map(c => `- ${c}`).join('\n')}

Concepto del gasto: "${concept}"

Regla estricta: Responde ÚNICAMENTE con el nombre de la categoría, sin comillas, sin puntos, ni texto adicional.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  // Intentamos hasta 3 veces en caso de saturación (503)
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (response.status === 503 && intento < 3) {
        console.warn(`Servidor saturado (503). Reintentando (${intento}/3)...`);
        await new Promise(res => setTimeout(res, 1000 * intento)); // Espera 1s, luego 2s
        continue;
      }

      if (!response.ok) {
        const errorDetail = await response.text();
        console.error(`Error de Google (HTTP ${response.status}):`, errorDetail);
        return null;
      }

      const data = await response.json();
      const aiCategory = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log("5. Respuesta de IA exitosa:", aiCategory);

      return VALID_CATEGORIES.includes(aiCategory) ? aiCategory : null;
      
    } catch (error) {
      console.error("Error de red al contactar Gemini:", error);
      return null;
    }
  }

  return null;
};