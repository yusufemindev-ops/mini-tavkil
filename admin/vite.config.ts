import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

function adminBaseRedirectPlugin(): Plugin {
  return {
    name: 'admin-base-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url ?? '/';
        const [pathname = '/', query] = rawUrl.split('?');
        const search = query ? `?${query}` : '';

        if (pathname === '/' || pathname === '/admin') {
          res.statusCode = 302;
          res.setHeader('Location', `/admin/dashboard${search}`);
          res.end();
          return;
        }

        const isInternalOrAsset =
          pathname.startsWith('/admin/') ||
          pathname.startsWith('/api') ||
          pathname.startsWith('/@') ||
          pathname.startsWith('/__') ||
          pathname.startsWith('/node_modules/') ||
          pathname.startsWith('/src/') ||
          /\.[a-z0-9]+$/i.test(pathname);

        if (!isInternalOrAsset) {
          res.statusCode = 302;
          res.setHeader('Location', `/admin${pathname}${search}`);
          res.end();
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  base: '/admin/',
  plugins: [adminBaseRedirectPlugin(), react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../public/admin'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/countries': path.resolve(__dirname, './src/vendor/countries'),
      '@repo/icons': path.resolve(__dirname, './src/vendor/icons'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
