/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENWEATHER_API_KEY: string
  // mais variáveis de ambiente aqui...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 