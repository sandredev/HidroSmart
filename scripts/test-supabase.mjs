import { loadEnv } from 'vite'
import { createSupabaseClient, readRoutes } from '../server/supabase.js'
import { normalizeEvents, normalizeSettings, todayRange } from '../src/lib/farm-data.js'

const env = loadEnv('development', process.cwd(), '')
// --supabase evita probar por accidente el backend local seleccionado en .env.
if (process.argv.includes('--supabase')) delete env.HIDROSMART_API_URL
const call = createSupabaseClient(env)
const report = await Promise.all(Object.entries(readRoutes).map(async ([resource, name]) => {
  const start = performance.now()
  try {
    const data = await call(name, { query: ['mediciones', 'riegos'].includes(resource) ? new URLSearchParams({ ...todayRange(), limite: '1' }) : undefined })
    if (resource === 'configuracion') normalizeSettings(data)
    if (resource === 'riegos') normalizeEvents(data)
    if (resource === 'mediciones' && !Array.isArray(data?.mediciones)) throw new Error('Falta data.mediciones')
    if (resource === 'estado' && !Object.hasOwn(data ?? {}, 'bomba_activa')) throw new Error('Falta data.bomba_activa')
    return { funcion: name, resultado: 'OK', ms: Math.round(performance.now() - start) }
  } catch (e) {
    return { funcion: name, resultado: 'ERROR', detalle: e.message, codigo: e.code, http: e.status }
  }
}))
console.table(report)
if (report.some(r => r.resultado !== 'OK')) process.exitCode = 1
