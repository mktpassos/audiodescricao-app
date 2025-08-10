export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  try {
    const raw = req.body;
    const body = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    const { imageUrl, imageBase64, mimeType } = body;

    let mime = mimeType || 'image/jpeg';
    let base64;

    if (imageUrl) {
      const r = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) return res.status(400).json({ ok: false, error: `Falha ao baixar a imagem (${r.status})` });
      mime = r.headers.get('content-type') || mime;
      base64 = Buffer.from(await r.arrayBuffer()).toString('base64');
    } else if (imageBase64 && mimeType) {
      base64 = imageBase64.includes(',') ? imageBase64.split(',').pop() : imageBase64;
      mime = mimeType;
    } else {
      return res.status(400).json({ ok: false, error: 'Envie imageUrl OU imageBase64 + mimeType.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY não configurada.' });

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Faça uma audiodescrição em PT-BR, objetiva (2–4 frases), inclusiva e sem suposições.' },
            { inline_data: { mime_type: mime, data: base64 } }
          ]
        }
      ]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await resp.json();

    if (!resp.ok) {
      return res.status(500).json({ ok: false, error: data?.error?.message || 'Erro na API do Gemini' });
    }

    const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text).join('').trim();
    return res.status(200).json({ ok: true, description: text || '(sem conteúdo)' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Erro inesperado' });
  }
}
