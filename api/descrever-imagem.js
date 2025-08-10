export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Use POST' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const imageUrl = body?.imageUrl;

    if (!imageUrl) {
      return res.status(400).json({ ok: false, error: 'Parâmetro "imageUrl" é obrigatório.' });
    }

    // sua chave no Vercel (Settings → Environment Variables)
    const apiKey = process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY não está configurada.' });
    }

    // 1) Baixar a imagem
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      throw new Error(`Falha ao baixar a imagem: ${imgResp.status} ${imgResp.statusText}`);
    }
    const mime = imgResp.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imgResp.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // 2) Chamar o Gemini 1.5 Flash (REST)
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Descreva esta imagem de forma breve, clara e em português.' },
            { inline_data: { mime_type: mime, data: base64 } }
          ]
        }
      ]
    };

    const gemUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `gemini-1.5-flash:generateContent?key=${apiKey}`;

    const gemResp = await fetch(gemUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await gemResp.json();
    if (!gemResp.ok) {
      throw new Error(data?.error?.message || 'Erro na API do Gemini');
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '(sem conteúdo)';

    return res.status(200).json({ ok: true, description: text });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
