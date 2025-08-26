# Project Manager (React + Firebase)

App de gerenciamento de projetos e tarefas com autenticação, projetos, tarefas (Kanban), notas, arquivos e uma visualização pública de projeto. Construído com Vite + React e integração (real) com Firebase ou mocks locais.

## Requisitos

- Node.js 18+
- Conta Firebase (opcional, para usar backend real)

## Configuração

1) Dependências

```
npm install
```

2) Variáveis de ambiente

Crie um arquivo `.env` na raiz com base no `.env.example`:

```
VITE_OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY

# Firebase Web App config
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=
```

3) Executar

```
npm run dev
```

## Build e Deploy

- Build local:

```
npm run build
```

- Deploy para GitHub Pages (usa o `base` do Vite `'/project-manager/'`):

```
npm run deploy
```

### Deploy no Vercel (recomendado para usar serverless functions)

Se você vinculou o repositório ao Vercel (GitHub integration), o próximo push/commit para a branch principal (`main`) já irá disparar um deploy automático.

Passos mínimos:

1. No painel do Vercel, selecione o projeto ligado ao repositório.
2. Em Settings > Environment Variables, adicione as variáveis necessárias (veja abaixo).
3. Build Command: `npm run build` — Output Directory: `dist` (Vite padrão).
4. Faça um commit/push; o deploy será executado automaticamente.

Variáveis de ambiente importantes para produção (defina em Vercel):

- GEMINI_API_URL — URL do endpoint Gemini (ex: endpoint público da Google GenAI se aplicável)
- GEMINI_API_KEY — Chave secreta da API Gemini (mantenha privada no Vercel)
- VITE_SUMMARY_PROXY_URL — (opcional) URL pública do proxy de resumo (ex: `https://<seu-projeto>.vercel.app/api/gemini-summary`). Se definido, o frontend usará esse proxy.
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_OPENWEATHER_API_KEY (opcional)

Observações de segurança e operação:

- Nunca coloque `GEMINI_API_KEY` em variáveis públicas do cliente; sempre armazene como variável de ambiente no provedor (Vercel) e use o proxy serverless (`/api/gemini-summary`) para manter a chave no servidor.
- Configure CORS se necessário (o proxy já roda sob o mesmo domínio do frontend quando implantado no Vercel).
- Teste a function após o deploy acessando `/api/gemini-summary` com um POST contendo `{ "prompt": "teste" }` (use uma ferramenta como `curl` ou Postman).

Exemplo rápido de teste com curl (substitua `https://<seu-projeto>.vercel.app`):

```bash
curl -X POST https://<seu-projeto>.vercel.app/api/gemini-summary \
   -H 'Content-Type: application/json' \
   -d '{"prompt":"Teste rápido"}'
```

Se tudo estiver ok, o endpoint irá retornar o JSON com o resultado do Gemini.


## Notas

- As chaves do Firebase e do OpenWeather devem ficar fora do controle de versão. Nunca commitar `.env`.
- O tema claro/escuro é controlado via `data-theme` e variáveis CSS (veja `theme.css`).
- O CSS do `@tldraw/tldraw` é importado diretamente no componente (`components/TldrawWithSave.tsx`).

## Firebase (opcional – backend real)

1) Crie um projeto no Firebase e adicione um App Web nas Configurações do Projeto > Geral. Copie a configuração (apiKey, authDomain, projectId, etc.).
2) Preencha as variáveis no `.env` conforme o `.env.example`.
3) Autenticação:
   - Ative o provedor Email/Senha em Authentication > Sign-in method.
   - Em Authentication > Settings > Authorized domains, adicione `http://localhost:5173` e `alyssonHK.github.io` (ou seu domínio de produção).
4) Firestore/Storage:
   - Crie o Firestore em modo seguro e defina regras apropriadas (donos podem CRUD, link público somente leitura via `shareId`).
5) Reinicie o `npm run dev` após alterar `.env` para o Vite injetar as variáveis.
