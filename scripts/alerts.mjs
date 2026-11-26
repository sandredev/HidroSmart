import { loadEnv } from 'vite'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { createSupabaseClient } from '../server/supabase.js'
import { evaluateReading, sendAlert } from '../server/email-alerts.js'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
if (!env.RESEND_API_KEY || !env.ALERT_EMAIL_TO) throw new Error('Completa RESEND_API_KEY y ALERT_EMAIL_TO en .env.')
// Este proceso vigila el dispositivo remoto, aunque la web use la API local.
delete env.HIDROSMART_API_URL
const call = createSupabaseClient(env)
mkdirSync('data', { recursive: true })
const db = new DatabaseSync('data/alerts.sqlite')
db.exec('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL)')
const save = state => db.prepare('INSERT INTO state VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json=excluded.json').run(JSON.stringify(state))
const once = process.argv.includes('--once')
let stopped = false
process.on('SIGINT', () => { stopped = true })
process.on('SIGTERM', () => { stopped = true })
do {
  try {
    const stored = db.prepare('SELECT json FROM state WHERE id=1').get()
    let state = stored ? JSON.parse(stored.json) : {}
    const [latest, settings] = await Promise.all([call('obtener-ultima-medicion'), call('obtener-configuracion')])
    const config = settings.configuracion ?? settings
    const minimum = config.humedad_minima ?? config.umbrales_humedad?.minimo
    if (!Number.isFinite(minimum) || minimum < 0 || minimum > 95) throw new Error('Umbral no compatible con margen de recuperación de 5 puntos.')
    state = evaluateReading(state, latest.medicion ?? latest, minimum)
    save(state)
    if (state.pending) {
      // Resend conserva las claves 24 h; nunca reenviar una solicitud ambigua fuera de esa ventana.
      if (Date.now() - state.pending.createdAt >= 23 * 3600000) throw new Error('Alerta pendiente demasiado antigua: requiere revisión manual antes de reenviar.')
      const id = await sendAlert(env, state.pending)
      state.lastEmailId = id
      delete state.pending
      save(state)
      console.log('Correo aceptado por Resend; entrega en bandeja pendiente de confirmar.')
    } else console.log('Monitor consultado; sin nueva alerta para enviar.')
  } catch (error) { console.error(error.message); if (once) process.exitCode = 1 }
  if (!once && !stopped) await new Promise(resolve => setTimeout(resolve, 10000))
} while (!once && !stopped)
db.close()
