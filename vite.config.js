import { Readable } from 'node:stream'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createChatHandler } from './server/hidroai.js'
import { createFarmHandler, createSupabaseClient } from './server/supabase.js'

function hidroAi(env) {
  const call = createSupabaseClient(env)
  const chat = createChatHandler({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, getContext: signal => call('obtener-contexto-hidroai', { signal }) })
  const farm = createFarmHandler(env)
  function install(server) {
    server.middlewares.use(async (req, res, next) => {
      const path = new URL(req.url, 'http://localhost').pathname
      if (path !== '/api/hidroai/chat' && !path.startsWith('/api/farm/')) return next()
      const controller = new AbortController()
      res.on('close', () => {
        if (!res.writableEnded) controller.abort()
      })
      try {
        const options = { method: req.method, headers: req.headers, signal: controller.signal }
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          options.body = Readable.toWeb(req)
          options.duplex = 'half'
        }
        const handler = path === '/api/hidroai/chat' ? chat : farm
        const result = await handler(new Request('http://localhost' + req.url, options))
        if (res.destroyed) return
        res.writeHead(result.status, Object.fromEntries(result.headers))
        res.end(await result.text())
      } catch (cause) {
        if (!res.destroyed) next(cause)
      }
    })
  }
  return { name: 'hidroai', configureServer: install, configurePreviewServer: install }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), hidroAi(loadEnv(mode, process.cwd(), ['GEMINI_', 'SUPABASE_', 'VITE_SUPABASE_', 'HIDROSMART_']))],
}))
