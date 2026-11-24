import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { loadEnv } from 'vite'
import { createLocalApi } from '../server/local-api.js'

const env = loadEnv('development', process.cwd(), '')
const file = resolve(env.HIDROSMART_DB_PATH || 'data/hidrosmart.sqlite')
mkdirSync(dirname(file), { recursive: true })
const api = createLocalApi({
  database: file, apiKey: env.HIDROSMART_API_KEY, deviceToken: env.HIDROSMART_DEVICE_TOKEN,
  deviceId: env.HIDROSMART_DEVICE_ID || 'esp8266-cultivo-01',
})
const port = Number(env.HIDROSMART_API_PORT || 8787)
const server = createServer(async (req, res) => {
  try {
    const options = { method: req.method, headers: req.headers }
    if (!['GET', 'HEAD'].includes(req.method)) { options.body = Readable.toWeb(req); options.duplex = 'half' }
    const response = await api.fetch(new Request('http://localhost:' + port + req.url, options))
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(await response.text())
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: { codigo: 'ERROR_INTERNO', mensaje: 'Error del servidor local.' } }))
  }
})
server.requestTimeout = 10000
server.maxHeadersCount = 30
server.listen(port, env.HIDROSMART_API_HOST || '0.0.0.0', () => {
  console.log('API local lista en http://localhost:' + port + '/functions/v1')
  console.log('Base de datos:', file)
})
function shutdown() { server.close(() => { api.close(); process.exit(0) }) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
