/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API + auth to Flask so the session cookie is same-site in dev.
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/auth': { target: 'http://localhost:5000', changeOrigin: true },
      '/healthz': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
