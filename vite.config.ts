import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Важно: делает пути относительными, чтобы они работали внутри .exe без сервера
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});