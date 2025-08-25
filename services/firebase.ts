// Importa as funções necessárias do SDK
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Configuração do Firebase do seu projeto
const firebaseConfig = {
  apiKey: "AIzaSyBkW26jyUJNw9kIBYLnnEiLTeRPtBb6sbU",
  authDomain: "projetos-78be8.firebaseapp.com",
  projectId: "projetos-78be8",
  storageBucket: "projetos-78be8.firebasestorage.app",
  messagingSenderId: "151662864542",
  appId: "1:151662864542:web:a6812c337f4ce50ad1338f",
  measurementId: "G-QHYXRG8F2G"
};
// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Analytics (opcional)
const analytics = getAnalytics(app);

export { app, analytics }; 