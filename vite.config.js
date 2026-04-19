import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ← Remplacez par le nom exact de votre dépôt GitHub
//   Ex : github.com/jordan/sef-mureaux  →  'sef-mureaux'
const REPO_NAME = 'sef-mureaux'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Extrait l'origine (https://script.google.com) depuis l'URL complète
  let scriptOrigin = 'https://script.google.com'
  let scriptPath   = ''
  if (env.VITE_APPS_SCRIPT_URL) {
    try {
      const u      = new URL(env.VITE_APPS_SCRIPT_URL)
      scriptOrigin = u.origin
      scriptPath   = u.pathname  // /macros/s/XXX/exec
    } catch (e) {}
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['vite.svg', 'icon-*.png'],
        manifest: {
          name: 'SEF Mureaux - Gestion Banque Alimentaire',
          short_name: 'SEF Mureaux',
          description: 'Application de gestion pour la banque alimentaire SEF Mureaux',
          theme_color: '#1c4a35',
          background_color: '#f5f0e8',
          icons: [
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          // Stratégie de cache pour les fichiers statiques
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache les appels API avec stratégie Network First
              urlPattern: /^https:\/\/script\.google\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 24 heures
                },
                networkTimeoutSeconds: 10,
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ],
          // Mode pour fonctionner hors ligne
          navigateFallback: undefined,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
        },
        devOptions: {
          enabled: true, // Active le service worker en dev
          type: 'module'
        }
      })
    ],

    // En production (GitHub Pages) → /sef-stock/
    // En local (dev)               → /
    base: mode === 'production' ? `/${REPO_NAME}/` : '/',

    server: {
      proxy: {
        '/api': {
          target:       scriptOrigin,   // https://script.google.com
          changeOrigin: true,
          // /api/macros/s/XXX/exec  →  /macros/s/XXX/exec
          rewrite: path => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            // Suit les redirections 302 que Google renvoie pour les POST
            proxy.on('proxyRes', (proxyRes, req, res) => {
              const location = proxyRes.headers['location']
              if ((proxyRes.statusCode === 301 || proxyRes.statusCode === 302) && location) {
                proxyRes.headers['access-control-allow-origin'] = '*'
              }
            })
          },
        },
      },
    },
  }
})