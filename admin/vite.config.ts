import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The admin is a Vite SPA served by the Worker under /admin, so every asset URL
// must be prefixed — hence `base`. It builds straight into the Next app's
// `public/admin`, which Workers serves as static assets.
export default defineConfig({
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(__dirname, '../public/admin'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Tavkil's workspace packages, vendored — this repo is not a monorepo.
      '@repo/countries': path.resolve(__dirname, './src/vendor/countries'),
      '@repo/icons': path.resolve(__dirname, './src/vendor/icons'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
