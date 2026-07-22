import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// PORT and BASE_PATH only matter for the local dev/preview server.
// `vite build` (what Vercel runs) never touches them, so we fall back to
// sane defaults instead of throwing and breaking the production build.
const port = parseInt(process.env.PORT || '5173', 10);
const basePath = process.env.BASE_PATH || '/';

const isProduction = process.env.NODE_ENV === 'production';
const isReplit = process.env.REPL_ID !== undefined;

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Use 'prompt' strategy: registerSW in main.tsx controls when to update.
      registerType: 'prompt',
      injectRegister: false, // We register manually in main.tsx
      // Enable in dev so the install flow can be tested without building.
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
      manifest: false, // We manage manifest.json in public/ ourselves
      workbox: {
        // Precache all Vite-built assets automatically.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Navigation fallback: SPA routes unknown to the SW resolve to index.html
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Network-first for HTML, cache-first for assets
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Never cache API calls
        navigateFallbackAllowlist: [/^(?!\/?api\/).*/],
      },
    }),
    // Replit-only dev tooling: these only ever load inside Replit's own
    // dev environment, so they have zero effect on `vite build` / Vercel.
    ...(!isProduction && isReplit
      ? [
          await import('@replit/vite-plugin-runtime-error-modal').then((m) =>
            m.default(),
          ),
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['workbox-window'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    // Notes/transactions/todos/links now live behind the api-server
    // (backed by Google Sheets). Proxy so the browser can call relative
    // "/api/..." paths without CORS/origin juggling in dev.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
