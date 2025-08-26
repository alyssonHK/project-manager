// Vercel serverless function: recebe { prompt } e encaminha para a API do Gemini
// Configure as variáveis de ambiente no Vercel: GEMINI_API_URL e GEMINI_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Missing prompt in request body' });
  // permite passar model no body; fallback para env ou default
  const model = (req.body && req.body.model) || process.env.GEMINI_MODEL || 'models/gemini-2.0-flash-lite';

  const apiUrl = process.env.GEMINI_API_URL || process.env.VITE_GEMINI_API_URL;
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error('gemini proxy misconfigured:', {
      hasApiUrl: Boolean(apiUrl),
      hasApiKey: Boolean(apiKey),
      usingModel: model,
    });
    return res.status(500).json({ error: 'Gemini API not configured on server' });
  }

  try {
    // payload: incluí model e prompt; o endpoint remoto pode ignorar campos inesperados
    const payload = { model, prompt };

    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const contentType = r.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await r.json();
    } else {
      // tenta texto quando não for JSON
      data = await r.text();
    }

    return res.status(200).json({ ok: true, result: data });
  } catch (err) {
    console.error('gemini proxy error', err && err.message ? err.message : String(err));
    return res.status(502).json({ error: 'Failed to call Gemini API', details: String(err && err.message ? err.message : err) });
  }
}
