import { Readable } from 'node:stream'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createChatHandler } from './server/hidroai.js'

function hidroAi(env) {
  const chat = createChatHandler({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL })
  function install(server) {
    server.middlewares.use(async (req, res, next) => {
      const path = new URL(req.url, 'http://localhost').pathname
      if (path !== '/api/hidroai/chat') return next()
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
        const result = await chat(new Request('http://localhost/api/hidroai/chat', options))
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
  plugins: [react(), tailwindcss(), hidroAi(loadEnv(mode, process.cwd(), 'GEMINI_'))],
}))
