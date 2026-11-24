import { DatabaseSync } from 'node:sqlite'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { ApiError, apiErrorResponse } from './supabase.js'

const finite = value => typeof value === 'number' && Number.isFinite(value)
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const methods = {
  'obtener-estado': 'GET', 'obtener-configuracion': 'GET',
  'obtener-ultima-medicion': 'GET', 'obtener-historial-mediciones': 'GET',
  'obtener-historial-riegos': 'GET', 'obtener-contexto-hidroai': 'GET',
  'actualizar-configuracion': 'PUT', 'crear-comando-riego': 'POST',
  'registrar-medicion': 'POST', 'registrar-evento-riego': 'POST',
  'actualizar-estado-dispositivo': 'POST', 'obtener-comando-pendiente': 'GET',
  'actualizar-estado-comando': 'POST',
}
const deviceRoutes = new Set(['registrar-medicion', 'registrar-evento-riego', 'actualizar-estado-dispositivo', 'obtener-comando-pendiente', 'actualizar-estado-comando'])

function sameSecret(a, b) {
  const x = Buffer.from(a || '')
  const y = Buffer.from(b || '')
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y)
}

function requireValid(condition, message) {
  if (!condition) throw new ApiError(message, 422, 'DATOS_INVALIDOS')
}

export function createLocalApi({ database, apiKey, deviceToken, deviceId = 'esp8266-cultivo-01', now = Date.now }) {
  if (!apiKey || !deviceToken) throw new Error('Configura HIDROSMART_API_KEY y HIDROSMART_DEVICE_TOKEN.')
  const db = new DatabaseSync(database)
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (kind,id))')
  const put = db.prepare('INSERT INTO records(kind,id,payload) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload')
  const get = db.prepare('SELECT payload FROM records WHERE kind=? AND id=?')
  const list = db.prepare('SELECT payload FROM records WHERE kind=?')
  const save = (kind, id, data) => put.run(kind, id, JSON.stringify(data))
  const read = (kind, id) => {
    const row = get.get(kind, id)
    return row ? JSON.parse(row.payload) : null
  }
  const all = kind => list.all(kind).map(row => JSON.parse(row.payload))
  const stamp = () => new Date(now()).toISOString()
  if (!read('config', 'main')) save('config', 'main', {
    umbrales_humedad: { minimo: 60, maximo: 80 }, tiempo_maximo_riego_segundos: 60, caudal: null,
  })

  function state() {
    expireCommands()
    const saved = read('device', deviceId)
    const online = saved && now() - Date.parse(saved.ultima_comunicacion) < 90_000
    const latest = latestReading()
    const freshReading = latest && now() - Date.parse(latest.fecha_medicion) < 90_000 && now() >= Date.parse(latest.fecha_medicion)
    return {
      dispositivo_id: deviceId,
      ultima_comunicacion: saved?.ultima_comunicacion ?? null,
      bomba_activa: online ? saved.bomba_activa : null,
      humedad_actual: freshReading ? latest.humedad : null,
      conexion: !saved ? 'sin_comunicacion' : online ? 'en_linea' : 'sin_conexion',
      comandos_disponibles: true,
      unidades: { volumen: 'litros' },
      ultimo_comando: all('command').sort((a, b) => b.creada_en.localeCompare(a.creada_en))[0] ?? null,
    }
  }

  function latestReading() {
    return all('measurement').filter(m => m.valida).sort((a, b) =>
      b.fecha_medicion.localeCompare(a.fecha_medicion) || b.id.localeCompare(a.id),
    )[0] ?? null
  }

  function history(kind, params, field) {
    const from = params.get('desde')
    const until = params.get('hasta')
    const limit = params.has('limite') ? Number(params.get('limite')) : 50
    requireValid(!from || date(from), 'Fecha desde inválida.')
    requireValid(!until || date(until), 'Fecha hasta inválida.')
    requireValid(!from || !until || Date.parse(from) < Date.parse(until), 'El inicio debe ser anterior al fin.')
    requireValid(Number.isInteger(limit) && limit >= 1 && limit <= 100, 'El límite debe estar entre 1 y 100.')
    const rows = all(kind).filter(row =>
      (kind !== 'measurement' || row.valida) &&
      (!from || Date.parse(row[field]) >= Date.parse(from)) &&
      (!until || Date.parse(row[field]) < Date.parse(until)),
    ).sort((a, b) => b[field].localeCompare(a[field]) || String(b.id ?? b.evento_id).localeCompare(String(a.id ?? a.evento_id)))
    const offset = Number(params.get('offset') || 0)
    requireValid(Number.isInteger(offset) && offset >= 0, 'Offset inválido.')
    return { rows: rows.slice(offset, offset + limit), total: rows.length, offset, limit }
  }

  function expireCommands() {
    for (const command of all('command')) {
      if (command.estado === 'pendiente' && Date.parse(command.expira_en) <= now()) {
        save('command', command.id, { ...command, estado: 'vencida' })
      }
    }
  }

  function execute(route, input, params) {
    switch (route) {
      case 'obtener-configuracion': return read('config', 'main')
      case 'actualizar-configuracion': {
        const { minimo, maximo } = input.umbrales_humedad || {}
        requireValid(finite(minimo) && finite(maximo) && minimo >= 0 && maximo <= 100 && minimo < maximo, 'Umbrales inválidos.')
        requireValid(Number.isInteger(input.tiempo_maximo_riego_segundos) && input.tiempo_maximo_riego_segundos >= 1 && input.tiempo_maximo_riego_segundos <= 300, 'Tiempo máximo inválido.')
        const config = { ...read('config', 'main'), umbrales_humedad: { minimo, maximo }, tiempo_maximo_riego_segundos: input.tiempo_maximo_riego_segundos }
        save('config', 'main', config)
        return { configuracion: config }
      }
      case 'obtener-estado': return state()
      case 'obtener-ultima-medicion': return { medicion: latestReading() }
      case 'obtener-historial-mediciones': {
        const result = history('measurement', params, 'fecha_medicion')
        return { mediciones: result.rows, total: result.total, siguiente_offset: result.offset + result.limit < result.total ? result.offset + result.limit : null }
      }
      case 'obtener-historial-riegos': {
        const result = history('irrigation', params, 'fecha_inicio')
        return { riegos: result.rows, total: result.total, siguiente_offset: result.offset + result.limit < result.total ? result.offset + result.limit : null }
      }
      case 'obtener-contexto-hidroai': {
        const current = state()
        const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(now())
        const from = new Date(day + 'T00:00:00-05:00')
        const range = new URLSearchParams({ desde: from.toISOString(), hasta: new Date(+from + 86400000).toISOString(), limite: '50' })
        return {
          humedad_actual: current.humedad_actual, estado_bomba: current.bomba_activa,
          ultima_medicion: latestReading(), historial_mediciones: history('measurement', range, 'fecha_medicion').rows,
          historial_riegos: history('irrigation', range, 'fecha_inicio').rows,
          configuracion: read('config', 'main'), ultima_comunicacion: current.ultima_comunicacion,
          unidades: { humedad: 'porcentaje_relativo', volumen: 'litros', caudal: 'litros_minuto' },
        }
      }
      case 'registrar-medicion': {
        requireValid(input.dispositivo_id === deviceId, 'Dispositivo no encontrado.')
        requireValid(finite(input.humedad) && input.humedad >= 0 && input.humedad <= 100, 'Humedad fuera de rango.')
        requireValid(input.valor_original == null || finite(input.valor_original), 'Valor original inválido.')
        requireValid(['relativa', 'calibrada'].includes(input.tipo_lectura) && typeof input.valida === 'boolean' && date(input.fecha_medicion), 'Lectura inválida.')
        requireValid(Date.parse(input.fecha_medicion) <= now() + 60_000, 'La medición está en el futuro.')
        const id = input.id ?? randomUUID()
        requireValid(typeof id === 'string' && id.length > 0 && id.length <= 100, 'Id inválido.')
        const reading = {
          id, dispositivo_id: deviceId, humedad: input.humedad, valor_original: input.valor_original ?? null,
          tipo_lectura: input.tipo_lectura, valida: input.valida, fecha_medicion: new Date(input.fecha_medicion).toISOString(),
        }
        const existing = read('measurement', id)
        if (existing && JSON.stringify(existing) !== JSON.stringify(reading)) throw new ApiError('Id de lectura ya utilizado.', 409, 'CONFLICTO')
        save('measurement', id, reading)
        const device = read('device', deviceId)
        save('device', deviceId, { ...device, ultima_comunicacion: stamp(), bomba_activa: device?.bomba_activa ?? null })
        return reading
      }
      case 'actualizar-estado-dispositivo': {
        requireValid(input.dispositivo_id === deviceId && typeof input.bomba_activa === 'boolean', 'Estado inválido.')
        const saved = { dispositivo_id: deviceId, ultima_comunicacion: stamp(), bomba_activa: input.bomba_activa }
        save('device', deviceId, saved)
        return saved
      }
      case 'registrar-evento-riego': {
        requireValid(date(input.fecha) && finite(input.humedad) && input.humedad >= 0 && input.humedad <= 100, 'Fecha o humedad inválidas.')
        if (input.accion === 'inicio') {
          requireValid(['automatico', 'manual', 'seguridad'].includes(input.motivo), 'Motivo inválido.')
          const event = { evento_id: randomUUID(), motivo: input.motivo, fecha_inicio: new Date(input.fecha).toISOString(), fecha_fin: null, humedad_inicio: input.humedad, humedad_fin: null, duracion_segundos: null, volumen: null, tipo_volumen: null }
          if (all('irrigation').some(e => !e.fecha_fin)) throw new ApiError('Ya hay un riego abierto.', 409, 'RIEGO_ABIERTO')
          save('irrigation', event.evento_id, event)
          return { ...event, accion: 'inicio' }
        }
        requireValid(input.accion === 'fin' && typeof input.evento_id === 'string', 'Acción inválida.')
        const event = read('irrigation', input.evento_id)
        if (!event) throw new ApiError('Riego no encontrado.', 404, 'NO_ENCONTRADO')
        if (event.fecha_fin) throw new ApiError('Riego ya cerrado.', 409, 'RIEGO_CERRADO')
        requireValid(finite(input.duracion_segundos) && input.duracion_segundos >= 0 && Date.parse(input.fecha) >= Date.parse(event.fecha_inicio), 'Duración o fecha final inválida.')
        requireValid(input.volumen == null || finite(input.volumen) && input.volumen >= 0 && ['medido', 'estimado'].includes(input.tipo_volumen), 'Volumen inválido.')
        const closed = { ...event, fecha_fin: new Date(input.fecha).toISOString(), humedad_fin: input.humedad, duracion_segundos: input.duracion_segundos, volumen: input.volumen ?? null, tipo_volumen: input.volumen == null ? null : input.tipo_volumen }
        save('irrigation', event.evento_id, closed)
        return { ...closed, accion: 'fin' }
      }
      case 'crear-comando-riego': {
        requireValid(['iniciar', 'detener'].includes(input.accion) && typeof input.id === 'string' && input.id.length > 0 && input.id.length <= 100, 'Comando inválido.')
        const existing = read('command', input.id)
        if (existing) {
          if (existing.accion !== input.accion) throw new ApiError('Id de comando ya utilizado.', 409, 'CONFLICTO')
          return { comando: existing }
        }
        if (state().bomba_activa === null) throw new ApiError('El dispositivo no ha confirmado un estado reciente.', 409, 'SIN_CONEXION')
        expireCommands()
        const pending = all('command').filter(c => c.estado === 'pendiente')
        if (input.accion === 'iniciar' && pending.length) throw new ApiError('Hay un comando pendiente.', 409, 'COMANDO_PENDIENTE')
        if (input.accion === 'detener') {
          for (const command of pending) save('command', command.id, { ...command, estado: 'cancelada' })
        }
        const command = { id: input.id, accion: input.accion, estado: 'pendiente', creada_en: stamp(), expira_en: new Date(now() + 15000).toISOString() }
        save('command', input.id, command)
        return { comando: command }
      }
      case 'obtener-comando-pendiente':
        expireCommands()
        return { comando: all('command').filter(c => c.estado === 'pendiente').sort((a, b) => a.creada_en.localeCompare(b.creada_en))[0] ?? null }
      case 'actualizar-estado-comando': {
        requireValid(typeof input.comando_id === 'string' && ['ejecutada', 'rechazada'].includes(input.estado), 'Resultado inválido.')
        const command = read('command', input.comando_id)
        if (!command) throw new ApiError('Comando no encontrado.', 404, 'NO_ENCONTRADO')
        if (command.estado === input.estado) return { comando: command }
        expireCommands()
        if (read('command', input.comando_id).estado !== 'pendiente') throw new ApiError('El comando ya terminó o venció.', 409, 'COMANDO_TERMINADO')
        const result = { ...command, estado: input.estado, procesada_en: stamp() }
        save('command', command.id, result)
        return { comando: result }
      }
      default: throw new ApiError('Ruta desconocida.', 404, 'NO_ENCONTRADO')
    }
  }

  return {
    close: () => db.close(),
    async fetch(request) {
      try {
        const url = new URL(request.url)
        const route = url.pathname.replace(/^\/functions\/v1\//, '')
        if (!Object.hasOwn(methods, route)) throw new ApiError('Ruta desconocida.', 404, 'NO_ENCONTRADO')
        if (request.method !== methods[route]) throw new ApiError('Método no permitido.', 405, 'METODO_NO_PERMITIDO')
        if (!sameSecret(request.headers.get('apikey'), apiKey)) throw new ApiError('Clave de aplicación inválida.', 401, 'NO_AUTORIZADO')
        if (deviceRoutes.has(route) && !sameSecret(request.headers.get('x-device-token'), deviceToken)) throw new ApiError('Token de dispositivo inválido.', 401, 'NO_AUTORIZADO')
        let input = {}
        if (request.method !== 'GET') {
          if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError('Usa JSON.', 415, 'FORMATO_INVALIDO')
          const bytes = await request.arrayBuffer()
          if (bytes.byteLength > 4096) throw new ApiError('Solicitud demasiado grande.', 413, 'DATOS_INVALIDOS')
          try { input = JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new ApiError('JSON inválido.', 400, 'JSON_INVALIDO') }
          requireValid(input && typeof input === 'object' && !Array.isArray(input), 'Se requiere un objeto JSON.')
        }
        const data = execute(route, input, url.searchParams)
        const status = route === 'crear-comando-riego' ? 202 : route.startsWith('registrar-') ? 201 : 200
        return Response.json({ ok: true, data }, { status, headers: { 'Cache-Control': 'no-store' } })
      } catch (error) { return apiErrorResponse(error) }
    },
  }
}
