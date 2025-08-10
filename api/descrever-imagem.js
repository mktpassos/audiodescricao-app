// api/descrever-imagem.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
// Pode usar 1.5-flash (rápido) ou 1.5-pro (melhor qualidade)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Vercel parseia JSON quando Content-Type é application/json
    const { imageUrl, imageBase64, mimeType } = req.body || {};

    if (!imageUrl && !imageBase64) {
      return res.status(400).json({
        ok: false,
        error: "Envie 'imageUrl' ou 'imageBase64'.",
      });
    }

    // Monta as "parts" para o Gemini
    const parts = [];

    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64.replace(/^data:.*;base64,/, ""), // remove prefixo data URL, se vier
          mimeType: mimeType || "image/jpeg",
        },
      });
    } else if (imageUrl) {
      // Mantém compatibilidade com URL (como você já testou)
      parts.push({ imageUrl });
    }

    // Prompt simples. Podemos melhorar depois para cenários específicos.
    parts.push({
      text:
        "Descreva a imagem de forma objetiva e amigável para um usuário com deficiência visual. " +
        "Use frases curtas e claras. Não invente detalhes.",
    });

    const result = await model.generateContent(parts);
    const text = result.response?.text?.() || "Sem resposta";

    return res.status(200).json({
      ok: true,
      description: text,
    });
  } catch (err) {
    console.error("descrever-imagem error:", err);
    return res.status(500).json({
      ok: false,
      error: "Erro ao processar a imagem.",
      details: String(err?.message || err),
    });
  }
}
