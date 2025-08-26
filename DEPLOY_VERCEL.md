Guia rápido de deploy no Vercel

1) Vincule o repositório ao Vercel (já feito).

2) Configure variáveis de ambiente no painel do Vercel (Project > Settings > Environment Variables):

- GEMINI_API_URL = <endpoint da Gemini>
- GEMINI_API_KEY = <sua chave secreta>
- VITE_SUMMARY_PROXY_URL = https://<seu-projeto>.vercel.app/api/gemini-summary (opcional, útil em ambientes externos)
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_OPENWEATHER_API_KEY (opcional)

3) Build settings:
- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist

4) Deploy:
- Commit e push para a branch `main`. O Vercel iniciará o deploy automaticamente.

5) Teste a function:
- Após o deploy, teste o proxy: POST para https://<seu-projeto>.vercel.app/api/gemini-summary com body JSON { "prompt": "texto de teste" }.

6) Observações:
- Se preferir testar localmente, instale o Vercel CLI (`npm i -g vercel`) e rode `vercel dev` para emular functions localmente.
- Mantenha as chaves sensíveis apenas nas variáveis de ambiente do provedor.
