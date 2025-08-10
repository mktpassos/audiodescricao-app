// api/descrever-imagem.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Aumenta o limite do body para imagens em base64
export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" },
  },
};

// -- Utilidades --------------------------------------------------------------

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

// Remove prefixo "data:image/*;base64," se vier
function sanitizeBase64(b64) {
  if (!b64) return "";
  return String(b64).replace(/^data:.*;base64,/, "").trim();
}

// Normaliza payload aceitando vários nomes de campos
function extractPayload(body = {}) {
  const imagemEmBase64 =
    body.imagemEmBase64 ||
    body.imageBase64 ||
    body.imagemBase64 ||
    body.base64 ||
    body.imagem;

  const imageUrl = body.imageUrl || body.url || body.imageURL;

  const mimeType =
    body.mimeType ||
    body.type ||
    body.contentType ||
    "image/jpeg";

  const language = body.language || body.lang || "pt-BR"; // pt-BR por padrão
  const mode = body.mode || "standard"; // "short" | "standard" | "long"

  return {
    imagemEmBase64: sanitizeBase64(imagemEmBase64),
    imageUrl,
    mimeType,
    language,
    mode,
  };
}

// Prompt otimizado para leitores de tela
function buildPrompt({ language = "pt-BR", mode = "standard" }) {
  const lengthHint =
    mode === "short" ? "Escreva 1 a 2 frases curtas." :
    mode === "long"  ? "Escreva 4 a 6 frases, ainda curtas." :
                       "Escreva 2 a 4 frases curtas.";

  // Diretrizes para TTS: frases simples, sem jargões, sem “a imagem mostra…”
  return `
Você é um sistema de audiodescrição para pessoas cegas.
Responda em ${language}.
${lengthHint}

Instruções de estilo:
- Use frases curtas, diretas e naturais para leitura em voz alta.
- Comece pelo assunto principal, depois ação, contexto/ambiente e cores proeminentes.
- Evite “parece”, “talvez”, “a foto/imagem mostra”.
- Se houver conteúdo sensível (ex.: nudez, violência), inicie com: "Conteúdo sensível:" e descreva de forma objetiva.
- Não inclua emojis, markdown, listas ou metadados. Somente texto corrido.
- Limite total a cerca de 400 caracteres.

Agora gere a audiodescrição.
`.trim();
}

// -- Handler -----------------------------------------------------------------

export default async function handler(req, res) {
  setCORS(res);

  // Pré-flight CORS
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: { code: "405", message: "Método não permitido. Use POST." } });
  }

  try {
    const { imagemEmBase64, imageUrl, mimeType, language, mode } = extractPayload(req.body);

    if (!imagemEmBase64 && !imageUrl) {
      return res.status(400).json({
        ok: false,
        error: { code: "400", message: "Envie 'imagemEmBase64' (ou 'imageBase64') OU 'imageUrl'." },
      });
    }

    // Chave do Gemini (usa qualquer uma das variáveis comuns)
    const apiKey =
      process.env.REACT_APP_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: { code: "500", message: "Chave do Gemini não configurada no servidor." },
      });
    }

    // Prepara inlineData: sempre manda base64 para o modelo
    let inlineData;
    if (imagemEmBase64) {
      inlineData = { data: imagemEmBase64, mimeType };
    } else {
      // Baixa a URL e converte para base64
      const r = await fetch(imageUrl);
      if (!r.ok) {
        return res.status(400).json({
          ok: false,
          error: { code: String(r.status), message: `Falha ao baixar imageUrl (${r.status}).` },
        });
      }
      const buf = Buffer.from(await r.arrayBuffer());
      inlineData = {
        data: buf.toString("base64"),
        mimeType: r.headers.get("content-type") || mimeType || "image/jpeg",
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = buildPrompt({ language, mode });

    const result = await model.generateContent([
      { text: prompt },
      { inlineData },
    ]);

    const text = result?.response?.text?.();
    if (!text || !text.trim()) {
      return res.status(500).json({
        ok: false,
        error: { code: "500", message: "Não foi possível gerar a audiodescrição." },
      });
    }

    return res.status(200).json({
      ok: true,
      description: text.trim(),
      meta: {
        model: "gemini-1.5-flash",
        language,
        mode,
      },
    });
  } catch (err) {
    console.error("[API ERRO]", err);
    return res.status(500).json({
      ok: false,
      error: {
        code: "500",
        message:
          err?.message ||
          "Erro no servidor ao gerar a audiodescrição.",
      },
    });
  }
}
