import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const base = process.env.VITE_BASE || '/project-manager/';
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
