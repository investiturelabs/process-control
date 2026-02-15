import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import './index.css'
import App from '@/App'

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

try {
  // config.ts eagerly validates env vars on import
  const { config } = await import('@/lib/config');
  const { initSentry } = await import('@/lib/sentry');

  initSentry(config.sentryDsn);

  const convex = new ConvexReactClient(config.convexUrl);

  createRoot(root).render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </StrictMode>,
  )
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown configuration error';
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:2rem;">
      <div style="max-width:28rem;text-align:center;">
        <h1 style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;color:#dc2626;">Configuration Error</h1>
        <p style="font-size:0.875rem;color:#666;line-height:1.5;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
    </div>
  `;
}
