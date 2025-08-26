import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  // Se estiver rodando no Vercel (process.env.VERCEL é definido), sirva na raiz '/'.
  const base = process.env.VITE_BASE || (process.env.VERCEL ? '/' : '/project-manager/');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Base configurável para suportar GitHub Pages (default) e deploys em raiz (Vercel)
    base,
  };
});
