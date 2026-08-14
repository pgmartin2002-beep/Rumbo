import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Rumbo',
        short_name: 'Rumbo',
        description: 'Aprovecha tus eventos: importa, prioriza y ejecuta.',
        theme_color: '#1c2b3f',
        background_color: '#eeece0',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
    }),
  ],
  server: {
    proxy: {
      // Sin timeout: la importación por URL con render + IA puede tardar hasta ~2 min (feature 004).
      '/api': { target: 'http://localhost:3001', changeOrigin: true, timeout: 0, proxyTimeout: 0 },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
});
