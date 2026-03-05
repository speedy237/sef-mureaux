import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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
    plugins: [react()],

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