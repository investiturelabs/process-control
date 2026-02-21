import path from 'path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function cspPlugin(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://*.clerk.accounts.dev https://clerk.audit-flows.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://img.clerk.com",
    "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.ingest.sentry.io https://*.clerk.accounts.dev https://clerk.audit-flows.com https://*.clerk.com https://cloudflareinsights.com",
    "worker-src 'self' blob:",
    "frame-src 'self' https://*.clerk.accounts.dev https://clerk.audit-flows.com https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'csp-meta-tag',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        // Only inject in production builds (ctx.server is defined in dev mode)
        if (ctx.server) return html
        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`,
        )
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const basePath = env.VITE_BASE_PATH || '/'

  return {
    base: basePath,
    plugins: [react(), tailwindcss(), cspPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
