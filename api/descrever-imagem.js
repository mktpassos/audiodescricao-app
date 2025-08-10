// api/descrever-imagem.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" }, // importante para base64
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imagemEmBase64, imageUrl, mimeType } = req.body || {};

    if (!imagemEmBase64 && !imageUrl) {
      return res.status(400).json({
        error: { code: "400", message: "Envie 'imagemEmBase64' ou 'imageUrl'." },
      });
    }

    // usa a sua env que já existe no Vercel; mantive fallbacks por segurança
    const apiKey =
      process.env.REACT_APP_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: { code: "500", message: "Chave do Gemini não configurada." },
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Sempre convertemos para inline base64 (o Gemini entende isso)
    let inlineData;

    if (imagemEmBase64) {
      inlineData = {
        data: imagemEmBase64,
        mimeType: mimeType || "image/jpeg",
      };
    } else {
      // Baixa a URL e converte pra base64
      const r = await fetch(imageUrl);
      if (!r.ok) throw new Error(`Falha ao baixar imageUrl (${r.status})`);
      const buf = Buffer.from(await r.arrayBuffer());
      inlineData = {
        data: buf.toString("base64"),
        mimeType: r.headers.get("content-type") || "image/jpeg",
      };
    }

    const prompt =
      "Descreva a imagem de forma objetiva e clara, em PT-BR, em 2 a 5 frases curtas.";

    const result = await model.generateContent([
      { text: prompt },
      { inlineData },
    ]);

    const text = result?.response?.text?.();
    if (!text) {
      return res.status(500).json({
        error: { code: "500", message: "Não foi possível gerar a descrição." },
      });
    }

    return res.status(200).json({ ok: true, description: text.trim() });
  } catch (err) {
    console.error("[API ERRO]", err);
    return res
      .status(500)
      .json({ error: { code: "500", message: err.message || "A server error has occurred" } });
  }
}
