import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLocalApi } from '../server/local-api.js'
import { createFarmHandler } from '../server/supabase.js'
import { normalizeEvents, normalizeReading, normalizeSettings, todayRange } from '../src/lib/farm-data.js'
import { createChatHandler } from '../server/hidroai.js'

test('API local: datos persistentes, validación, comandos y contexto de un sensor', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'hidrosmart-test-'))
  let now = Date.parse('2026-11-24T15:00:00Z')
  const config = { database: join(folder, 'test.sqlite'), apiKey: 'test-key', deviceToken: 'test-device', now: () => now }
  let api = createLocalApi(config)
  async function send(route, body, { device = true, key = 'test-key', method = body ? 'POST' : 'GET' } = {}) {
    const response = await api.fetch(new Request('http://localhost/functions/v1/' + route, {
      method, headers: { apikey: key, 'Content-Type': 'application/json', ...(device ? { 'x-device-token': 'test-device' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }))
    return { status: response.status, ...(await response.json()) }
  }
  try {
    assert.equal((await send('obtener-estado', null, { key: 'invalid' })).status, 401)
    assert.equal((await send('obtener-ultima-medicion')).data.medicion, null)
    assert.equal((await send('obtener-estado')).data.bomba_activa, null)
    const reading = { id: 'retry-reading', dispositivo_id: 'esp8266-cultivo-01', humedad: 68.4, valor_original: 655, tipo_lectura: 'calibrada', valida: true, fecha_medicion: new Date(now).toISOString() }
    assert.equal((await send('registrar-medicion', reading, { device: false })).status, 401)
    assert.equal((await send('registrar-medicion', { ...reading, humedad: 101 })).status, 422)
    assert.equal((await send('registrar-medicion', reading)).status, 201)
    assert.equal((await send('registrar-medicion', reading)).status, 201)
    assert.equal((await send('obtener-historial-mediciones')).data.mediciones.length, 1)
    assert.equal((await send('registrar-medicion', { ...reading, humedad: 55 })).status, 409)
    await send('registrar-medicion', { ...reading, id: 'invalid', humedad: 10, valida: false })
    assert.equal((await send('obtener-historial-mediciones')).data.mediciones.length, 1)
    const latest = (await send('obtener-ultima-medicion')).data.medicion
    assert.equal(normalizeReading(latest).humidity, 68.4)

    await send('actualizar-estado-dispositivo', { dispositivo_id: reading.dispositivo_id, bomba_activa: false })
    const command = await send('crear-comando-riego', { id: 'command-1', accion: 'iniciar' })
    assert.equal(command.status, 202)
    assert.equal((await send('obtener-estado')).data.bomba_activa, false)
    assert.equal((await send('obtener-comando-pendiente')).data.comando.id, 'command-1')
    await send('actualizar-estado-comando', { comando_id: 'command-1', estado: 'ejecutada' })
    await send('actualizar-estado-dispositivo', { dispositivo_id: reading.dispositivo_id, bomba_activa: true })
    assert.equal((await send('obtener-estado')).data.bomba_activa, true)

    const start = await send('registrar-evento-riego', { accion: 'inicio', motivo: 'manual', fecha: new Date(now).toISOString(), humedad: 68.4 })
    assert.equal(start.status, 201)
    now += 30000
    assert.equal((await send('registrar-evento-riego', { accion: 'fin', evento_id: 'missing', fecha: new Date(now).toISOString(), humedad: 70, duracion_segundos: 30 })).status, 404)
    assert.equal((await send('registrar-evento-riego', { accion: 'fin', evento_id: start.data.evento_id, fecha: new Date(now).toISOString(), humedad: 70, duracion_segundos: 30 })).status, 201)
    assert.equal(normalizeEvents((await send('obtener-historial-riegos')).data)[0].seconds, 30)
    const settings = { umbrales_humedad: { minimo: 55, maximo: 75 }, tiempo_maximo_riego_segundos: 45 }
    assert.equal((await send('actualizar-configuracion', settings, { method: 'PUT' })).status, 200)
    assert.equal(normalizeSettings((await send('obtener-configuracion')).data).min, 55)
    await send('crear-comando-riego', { id: 'expired', accion: 'detener' })
    now += 16000
    assert.equal((await send('obtener-comando-pendiente')).data.comando, null)
    assert.equal((await send('obtener-estado')).data.ultimo_comando.estado, 'vencida')
    now += 90000
    assert.equal((await send('obtener-estado')).data.bomba_activa, null)

    api.close()
    api = createLocalApi(config)
    assert.equal((await send('obtener-ultima-medicion')).data.medicion.humedad, 68.4)
    assert.equal((await send('obtener-configuracion')).data.umbrales_humedad.minimo, 55)

    const env = { HIDROSMART_API_URL: 'http://127.0.0.1:8787/functions/v1', HIDROSMART_API_KEY: 'test-key' }
    const proxy = createFarmHandler(env, (url, options) => api.fetch(new Request(url, options)))
    const response = await proxy(new Request('http://localhost/api/farm/configuracion'))
    assert.equal(response.status, 200)
    assert.equal((await response.json()).data.umbrales_humedad.minimo, 55)

    const chat = createChatHandler({
      apiKey: 'gemini-test',
      getContext: async () => (await send('obtener-contexto-hidroai')).data,
      fetchGemini: async (_url, options) => {
        const body = JSON.parse(options.body)
        assert.match(body.contents.at(-1).parts[0].text, /API del cultivo/)
        assert.match(body.contents.at(-1).parts[0].text, /68.4/)
        return Response.json({ candidates: [{ content: { parts: [{ text: 'La lectura registrada es 68,4%.' }] } }] })
      },
    })
    const answer = await chat(new Request('http://localhost/api/hidroai/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origen: 'api', pregunta: '¿Cómo está la humedad?', turnos: [] }),
    }))
    assert.equal(answer.status, 200)
    assert.equal((await answer.json()).data.respuesta, 'La lectura registrada es 68,4%.')
    const range = todayRange(Date.parse('2026-11-25T02:00:00Z'))
    assert.equal(range.desde, '2026-11-24T05:00:00.000Z')
    console.log('Verificados SQLite, un sensor, órdenes confirmadas, reconexión y contexto para Gemini.')
  } finally { api.close(); rmSync(folder, { recursive: true, force: true }) }
})

test('adaptador Supabase agrega dispositivo_id sin alterar los filtros ni enviar claves locales', async () => {
  const { createSupabaseClient } = await import('../server/supabase.js')
  const call = createSupabaseClient({
    SUPABASE_BASEURL: 'https://example.supabase.co/functions/v1',
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable',
    SUPABASE_DEVICE_ID: 'registered-device',
    HIDROSMART_API_KEY: 'local-only',
  }, async (url, options) => {
    assert.equal(url.searchParams.get('dispositivo_id'), 'registered-device')
    assert.equal(url.searchParams.get('limite'), '2')
    assert.equal(options.headers.apikey, 'test-publishable')
    assert.equal(options.headers['x-device-token'], undefined)
    return Response.json({ ok: true, data: { mediciones: [] } })
  })
  assert.deepEqual(await call('obtener-historial-mediciones', { query: new URLSearchParams({ limite: '2' }) }), { mediciones: [] })
})

test('configuración real de Supabase con límites planos y objeto anidado', () => {
  assert.deepEqual(normalizeSettings({ dispositivo_id: 'test', configuracion: {
    humedad_minima: 40, humedad_maxima: 70, tiempo_maximo_riego_segundos: 30,
  } }), { min: 40, max: 70, seconds: 30, plants: null })
  assert.throws(() => normalizeSettings({ configuracion: {
    humedad_minima: 70, humedad_maxima: 40, tiempo_maximo_riego_segundos: 30,
  } }))
})

test('proxy remoto traduce escrituras y conserva el token de operador en el servidor', async () => {
  const calls = []
  const env = {
    SUPABASE_BASEURL: 'https://example.supabase.co/functions/v1',
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable',
    SUPABASE_OPERATOR_TOKEN: 'operator-secret',
    SUPABASE_COMMANDS_ENABLED: 'true',
    SUPABASE_DEVICE_ID: 'registered-device',
  }
  const proxy = createFarmHandler(env, async (url, options) => {
    calls.push({ url, options, body: options.body ? JSON.parse(options.body) : null })
    if (url.pathname.endsWith('/crear-comando-riego')) {
      return Response.json({ ok: true, data: { comando: { id: 'remote-command', estado: 'pendiente' } } }, { status: 201 })
    }
    if (url.pathname.endsWith('/actualizar-configuracion')) {
      return Response.json({ ok: true, data: { configuracion: { humedad_minima: 40, humedad_maxima: 70, tiempo_maximo_riego_segundos: 30 } } })
    }
    return Response.json({ ok: true, data: { bomba_activa: false, ultima_comunicacion: new Date().toISOString() } })
  })

  const state = await proxy(new Request('http://localhost/api/farm/estado'))
  assert.equal((await state.json()).data.comandos_disponibles, true)

  const command = await proxy(new Request('http://localhost/api/farm/comando', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'browser-id', accion: 'iniciar' }),
  }))
  assert.equal(command.status, 202)
  assert.deepEqual(calls.at(-1).body, { dispositivo_id: 'registered-device', accion: 'iniciar_riego' })
  assert.equal(calls.at(-1).options.headers['x-operator-token'], 'operator-secret')

  const config = await proxy(new Request('http://localhost/api/farm/configuracion', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ umbrales_humedad: { minimo: 40, maximo: 70 }, tiempo_maximo_riego_segundos: 30 }),
  }))
  assert.equal(config.status, 200)
  assert.deepEqual(calls.at(-1).body, {
    dispositivo_id: 'registered-device', humedad_minima: 40, humedad_maxima: 70, tiempo_maximo_riego_segundos: 30,
  })
  assert.equal(calls.at(-1).options.headers['x-operator-token'], 'operator-secret')
})

test('proxy remoto rechaza escrituras si falta el token de operador', async () => {
  const proxy = createFarmHandler({
    SUPABASE_BASEURL: 'https://example.supabase.co/functions/v1',
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable',
    SUPABASE_DEVICE_ID: 'registered-device',
  }, async () => { throw new Error('No debe invocar Supabase') })
  const response = await proxy(new Request('http://localhost/api/farm/comando', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'browser-id', accion: 'detener' }),
  }))
  assert.equal(response.status, 503)
  assert.equal((await response.json()).error.codigo, 'OPERADOR_SIN_CONFIGURAR')
})
