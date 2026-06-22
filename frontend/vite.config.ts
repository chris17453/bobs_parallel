/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In Docker the API is reachable as http://api:5000; on bare metal it's localhost.
// VITE_PROXY_TARGET (set by docker-compose) overrides the default.
const apiTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

// https://vite.dev/config/  (test block typed via the vitest/config reference above)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split big, rarely-changing vendors into their own long-cacheable chunks.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true, // listen on 0.0.0.0 so the container port is reachable
    proxy: {
      // Proxy API + auth to Flask so the session cookie is same-site in dev.
      '/api': { target: apiTarget, changeOrigin: true },
      '/auth': { target: apiTarget, changeOrigin: true },
      '/healthz': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
