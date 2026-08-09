import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { generateBuildInfo } from './scripts/pre-build.js'

// Custom Vite plugin to generate build info
const generateBuildInfoPlugin = () => {
  return {
    name: 'generate-build-info',
    buildStart() {
      generateBuildInfo();
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('package.json')) {
        console.log('package.json changed, regenerating build info...');
        generateBuildInfo();
        server.hot.send({ type: 'full-reload', path: '*' });
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Strip chatty logging from production bundles. console.warn/error are kept on purpose —
  // real failures should still be visible in the field. `pure` (rather than `drop`) removes
  // only calls whose value is unused, which is all of ours.
  esbuild: mode === 'production'
    ? { pure: ['console.log', 'console.debug', 'console.info'], drop: ['debugger'] }
    : undefined,
  plugins: [
    generateBuildInfoPlugin(),
    tailwindcss(),
    vue(),
    // --- PWA CONFIGURATION ---
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'SwipeDict',
        short_name: 'SwipeDict',
        description: 'The swipe-based dictionary learning app.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cache these assets for offline use
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        // Don't cache the API requests via service worker (we handle that with IndexedDB)
        navigateFallbackDenylist: [/^\/api/] 
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api-proxy': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
      }
    }
  }
}))