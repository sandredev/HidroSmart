import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateReading, sendAlert } from '../server/email-alerts.js'

test('tres lecturas distintas, recuperación y descarte de lecturas antiguas o inválidas', () => {
  let now = Date.now(), state = {}
  const reading = humidity => ({ humedad: humidity, valida: true, tipo_lectura: 'calibrada', fecha_medicion: new Date(now).toISOString() })
  state = evaluateReading(state, reading(20), 40, now)
  state = evaluateReading(state, reading(20), 40, now)
  assert.equal(state.count, 1)
  now += 30000; state = evaluateReading(state, reading(20), 40, now)
  now += 30000; state = evaluateReading(state, reading(20), 40, now)
  assert.ok(state.pending)
  const key = state.pending.key
  now += 30000; state = evaluateReading(state, reading(20), 40, now)
  assert.equal(state.pending.key, key)
  delete state.pending
  now += 30000; state = evaluateReading(state, reading(20), 40, now)
  assert.equal(state.pending, undefined)
  now += 30000; state = evaluateReading(state, reading(46), 40, now)
  assert.equal(state.latched, false)
  now += 30000; state = evaluateReading(state, { ...reading(0), valida: false }, 40, now)
  assert.equal(state.count, 0)
  now += 30000; state = evaluateReading(state, reading(0), 40, now + 120000)
  assert.equal(state.count, 0)
})

test('envío usa clave estable y no confirma respuestas fallidas', async () => {
  const env = { RESEND_API_KEY: 'test', ALERT_EMAIL_TO: 'test@example.com' }
  const alert = { key: 'test-episode', humidity: 10, minimum: 40, at: '2026-11-25T12:00:00Z' }
  const id = await sendAlert(env, alert, async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails')
    assert.equal(options.headers['Idempotency-Key'], alert.key)
    assert.equal(JSON.parse(options.body).to[0], env.ALERT_EMAIL_TO)
    return Response.json({ id: 'accepted' })
  })
  assert.equal(id, 'accepted')
  await assert.rejects(sendAlert(env, alert, async () => Response.json({}, { status: 429 })))
})
