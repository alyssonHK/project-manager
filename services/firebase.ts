// Importa as funções necessárias do SDK
import { initializeApp } from "firebase/app";

// Configuração do Firebase via variáveis de ambiente Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validação amigável das variáveis
const requiredEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = requiredEnv.filter((key) => {
  const val = (import.meta.env as any)[key];
  return !val || String(val).startsWith('YOUR_');
});

if (missing.length > 0) {
  // Mensagem clara para o dev
  // Não logamos valores, apenas nomes das variáveis
  const message = `Firebase config inválida. Defina as variáveis ${missing.join(', ')} no arquivo .env (vide .env.example) e reinicie o dev server.`;
  // Lançar erro cedo para evitar mensagens confusas do SDK
  throw new Error(message);
}

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

export { app };
