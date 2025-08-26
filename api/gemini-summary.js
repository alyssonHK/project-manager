// Vercel serverless function: recebe { prompt } e encaminha para a API do Gemini
// Configure as variáveis de ambiente no Vercel: GEMINI_API_URL e GEMINI_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Missing prompt in request body' });

  const apiUrl = process.env.GEMINI_API_URL || process.env.VITE_GEMINI_API_URL;
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.status(500).json({ error: 'Gemini API not configured on server' });
  }

  try {
    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await r.json();

    // Retorna o objeto original recebido da API. O frontend decide como extrair o texto.
    return res.status(200).json({ ok: true, result: data });
  } catch (err) {
    console.error('gemini proxy error', err);
    return res.status(502).json({ error: 'Failed to call Gemini API', details: String(err) });
  }
}
