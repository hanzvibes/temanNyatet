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
      // 'autoUpdate': new SW calls skipWaiting immediately on install so it
      // activates without waiting for user interaction. This prevents the
      // stuck-loading bug where an old SW keeps serving stale cached chunks
      // after a new Vercel deployment changes asset hashes.
      registerType: 'autoUpdate',
      injectRegister: false, // We register manually in main.tsx
      // Keep development previews free of a synthetic SW precache pass. The
      // production build still emits the full PWA service worker.
      devOptions: {
        enabled: false,
        type: 'module',
        navigateFallback: 'index.html',
      },
      manifest: false, // We manage manifest.json in public/ ourselves
      workbox: {
        // After skipWaiting activates the new SW, immediately claim all open
        // tabs so they don't keep running stale JS from the old SW's cache.
        clientsClaim: true,
        // Precache all Vite-built assets automatically.
        // Keep the install-time precache small. Fonts and image assets are
        // fetched on demand and cached by the browser, so they do not delay
        // the first interactive PWA launch.
        globPatterns: ['index.html', 'assets/**/*.{js,css}'],
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
    rollupOptions: {
      output: {
        // Split vendor libs into separate chunks so the browser can:
        //   1. Download them in parallel on first visit
        //   2. Cache them independently — a UI update doesn't bust the charts chunk
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Supabase SDK — large auth/realtime client, isolated for caching
          if (id.includes('@supabase/')) return 'supabase';
          // TanStack Query — data fetching layer
          if (id.includes('@tanstack/')) return 'query';
          // Recharts + its D3 dependencies — only loaded on Keuangan page
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'charts';
          // Drag-and-drop — only loaded on Catatan page
          if (id.includes('@dnd-kit/')) return 'dnd';
          // Animation / bottom-sheet libs
          if (id.includes('framer-motion') || id.includes('vaul')) return 'motion';
          // Radix UI primitives — many small packages, group together
          if (id.includes('@radix-ui/')) return 'radix';
          // date-fns — date formatting utilities
          if (id.includes('date-fns')) return 'datefns';
          // Everything else (react, react-dom, zod, wouter, lucide, clsx, etc.)
          // React intentionally NOT split — separating it causes circular chunk
          // warnings because many vendor libs import React directly.
          return 'vendor';
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    // Notes/transactions/todos/links live behind the api-server (stored in
    // PostgreSQL). Proxy so the browser can call relative "/api/..." paths
    // without CORS/origin juggling in dev.
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
