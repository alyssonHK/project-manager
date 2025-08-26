// Vercel serverless function: recebe { prompt } e encaminha para a API do Gemini
// Configure as variáveis de ambiente no Vercel: GEMINI_API_URL e GEMINI_API_KEY

import { GoogleAuth, JWT } from 'google-auth-library';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Missing prompt in request body' });
  // permite passar model no body; fallback para env ou default
  const model = (req.body && req.body.model) || process.env.GEMINI_MODEL || 'models/gemini-2.0-flash-lite';

  const apiUrl = process.env.GEMINI_API_URL || process.env.VITE_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent';
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const serviceAccountJson = process.env.GEMINI_SERVICE_ACCOUNT_KEY || process.env.VITE_GEMINI_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.GEMINI_PROJECT_ID || process.env.VITE_GEMINI_PROJECT_ID || process.env.GEMINI_PROJECT_ID;

  if (!apiUrl || (!apiKey && !serviceAccountJson)) {
    console.error('gemini proxy misconfigured:', {
      hasApiUrl: Boolean(apiUrl),
      hasApiKey: Boolean(apiKey),
      hasServiceAccount: Boolean(serviceAccountJson),
      usingModel: model,
    });
    return res.status(500).json({ error: 'Gemini API not configured on server' });
  }

  try {
    // payload: incluí model e prompt; o endpoint remoto pode ignorar campos inesperados
    const payload = { model, prompt };

    let fetchUrl = apiUrl;
    const headers = { 'Content-Type': 'application/json' };

    // Se houver service account JSON, gere um access token e use Bearer
  if (serviceAccountJson) {
      try {
        const creds = JSON.parse(serviceAccountJson);
        // Use JWT client explicitly so we request the cloud-platform scope
        const jwtClient = new JWT({
          email: creds.client_email,
          key: creds.private_key,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const r = await jwtClient.authorize();
        const tokenValue = r && r.access_token ? r.access_token : jwtClient.credentials && jwtClient.credentials.access_token ? jwtClient.credentials.access_token : null;
        if (tokenValue) {
          headers['Authorization'] = `Bearer ${tokenValue}`;
          // if user supplied a project id, include x-goog-user-project for billing/project selection
          if (projectId) headers['x-goog-user-project'] = projectId;
        } else {
          console.error('gemini proxy: failed to obtain access token from JWT client', { hasResponse: Boolean(r), credsKeys: Object.keys(creds || {}) });
          return res.status(502).json({ error: 'Failed to obtain access token from service account (JWT)' });
        }
      } catch (e) {
        console.error('gemini proxy: error generating access token (JWT)', e && e.message ? e.message : String(e));
        return res.status(502).json({ error: 'Failed to generate access token (JWT)', details: e && e.message ? e.message : String(e) });
      }
    } else if (apiKey) {
      // API Key path: adiciona ?key=...
      const sep = fetchUrl.includes('?') ? '&' : '?';
      fetchUrl = `${fetchUrl}${sep}key=${encodeURIComponent(apiKey)}`;
    }

  const r = await fetch(fetchUrl, {
      method: 'POST',
      headers,
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

    // If debug flag requested, fetch token scopes from tokeninfo and include only scopes in debug
    if (req.body && req.body.debug === true && headers['Authorization']) {
      try {
        const token = headers['Authorization'].replace('Bearer ', '');
        const infoRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`);
        const info = await infoRes.json();
        const scopes = info.scope || info.scopes || null;
        return res.status(200).json({ ok: true, result: data, debug: { token_scopes: scopes } });
      } catch (e) {
        console.error('gemini proxy: failed to fetch tokeninfo for debug', e && e.message ? e.message : String(e));
        // fallthrough to return normal result
      }
    }

    return res.status(200).json({ ok: true, result: data });
  } catch (err) {
    console.error('gemini proxy error', err && err.message ? err.message : String(err));
    return res.status(502).json({ error: 'Failed to call Gemini API', details: String(err && err.message ? err.message : err) });
  }
}
