import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Local dev / preview: serve api/*.js (the Vercel functions) from the Vite server too, so Live, the Milestone Tracker
// and live injuries work on localhost exactly as on Vercel.
function vercelApi() {
  const mount = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const m = req.url.match(/^\/api\/([a-z0-9-]+)(\?.*)?$/i)
      if (!m) return next()
      try {
        const file = pathToFileURL(path.resolve(process.cwd(), 'api', `${m[1]}.js`)).href
        const mod = await import(`${file}?t=${Date.now()}`)
        req.query = Object.fromEntries(new URLSearchParams(m[2] || ''))
        const shim = {
          setHeader(k, v) { res.setHeader(k, v) },
          status(code) { res.statusCode = code; return shim },
          json(body) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) },
        }
        await mod.default(req, shim)
      } catch (e) {
        res.statusCode = 500
        res.end(String(e))
      }
    })
  }
  return { name: 'vercel-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({
  plugins: [react(), vercelApi()],
})
