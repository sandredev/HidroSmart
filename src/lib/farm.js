import { useEffect, useState } from 'react'
import { normalizeEvents, normalizeReading, normalizeSettings, todayRange } from './farm-data.js'

async function request(resource, options = {}) {
  const response = await fetch('/api/farm/' + resource, options)
  const json = await response.json().catch(() => null)
  if (!response.ok || json?.ok !== true) throw new Error(json?.error?.mensaje || 'No se pudieron consultar los datos del cultivo.')
  return json.data
}

async function requestHistory(resource, query, signal) {
  let result = await request(resource + '?' + query, { signal })
  const field = resource === 'riegos' ? 'riegos' : 'mediciones'
  const dateField = resource === 'riegos' ? 'fecha_inicio' : 'fecha_medicion'
  const from = Date.parse(query.get('desde'))
  const rows = [...(result[field] ?? [])]
  let offset = result.siguiente_offset
  let page = result.paginacion?.pagina
  const pages = result.paginacion?.total_paginas
  while (Number.isInteger(offset) && offset > 0) {
    const pageQuery = new URLSearchParams(query)
    pageQuery.set('offset', String(offset))
    result = await request(resource + '?' + pageQuery, { signal })
    rows.push(...(result[field] ?? []))
    if (result.siguiente_offset != null && result.siguiente_offset <= offset) throw new Error('Paginación inválida.')
    offset = result.siguiente_offset
  }
  const pageReachesStart = () => {
    const lastDate = Date.parse(result[field]?.at(-1)?.[dateField])
    return Number.isFinite(from) && Number.isFinite(lastDate) && lastDate < from
  }
  while (Number.isInteger(page) && Number.isInteger(pages) && page < pages && !pageReachesStart()) {
    page += 1
    const pageQuery = new URLSearchParams(query)
    pageQuery.set('pagina', String(page))
    result = await request(resource + '?' + pageQuery, { signal })
    rows.push(...(result[field] ?? []))
  }
  return { ...result, [field]: rows }
}

const initial = {
  settings: { min: null, max: null, seconds: null, plants: null },
  points: [], reading: null, events: [], pumpActive: null, scenario: 'loading', errors: [],
  commandsAvailable: false, command: null, volumeUnit: null,
}

export function useFarm(enabled) {
  const [data, setData] = useState(initial)
  const [retry, setRetry] = useState(0)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let timer
    const controller = new AbortController()
    async function poll() {
      const currentTime = Date.now()
      const query = new URLSearchParams({ ...todayRange(currentTime), limite: '100' })
      const resources = ['estado', 'configuracion', 'ultima', 'mediciones?' + query, 'riegos?' + query]
      const responses = await Promise.allSettled(resources.map((resource, index) => {
        if (index === 3) return requestHistory('mediciones', query, controller.signal)
        if (index === 4) return requestHistory('riegos', query, controller.signal)
        return request(resource, { signal: controller.signal })
      }))
      if (disposed) return
      const next = { ...initial, settings: { ...initial.settings }, errors: [] }
      function apply(index, fn) {
        const result = responses[index]
        if (result.status === 'rejected') next.errors.push(result.reason.message)
        else {
          try { fn(result.value) } catch (error) { next.errors.push(error.message) }
        }
      }
      let communication = NaN
      apply(0, state => {
        communication = Date.parse(state?.ultima_comunicacion)
        const age = currentTime - communication
        next.pumpActive = age >= -5000 && age < 90_000 && typeof state?.bomba_activa === 'boolean' ? state.bomba_activa : null
        next.commandsAvailable = state?.comandos_disponibles === true
        next.command = state?.ultimo_comando ?? null
        next.volumeUnit = state?.unidades?.volumen ?? null
      })
      apply(1, config => { next.settings = normalizeSettings(config) })
      apply(2, latest => {
        const value = Object.hasOwn(latest ?? {}, 'medicion') ? latest.medicion : latest
        next.reading = normalizeReading(value)
      })
      apply(3, history => {
        if (!Array.isArray(history?.mediciones)) throw new Error('El historial de humedad tiene un formato diferente del contrato.')
        next.points = history.mediciones.map(normalizeReading).filter(Boolean)
          .filter(p => p.at >= Date.parse(query.get('desde')) && p.at < Date.parse(query.get('hasta')))
          .sort((a, b) => a.at - b.at)
      })
      apply(4, history => {
        next.events = normalizeEvents(history).filter(e => e.at >= Date.parse(query.get('desde')) && e.at < Date.parse(query.get('hasta')))
        next.events = next.events.map(e => ({ ...e, volumeUnit: next.volumeUnit }))
      })
      const readingAge = next.reading ? currentTime - next.reading.at : Infinity
      next.scenario = next.errors.length ? 'error'
        : !next.reading && !Number.isFinite(communication) ? 'empty'
          : next.pumpActive === null || currentTime - communication > 90_000 || currentTime - communication < -5000 ? 'offline'
            : !next.reading ? 'uncalibrated'
              : readingAge > 90_000 || readingAge < -5000 ? 'offline' : 'normal'
      setData(next)
      setNow(currentTime)
      timer = setTimeout(poll, 2_000)
    }
    void poll()
    return () => { disposed = true; controller.abort(); clearTimeout(timer) }
  }, [enabled, retry])

  async function updateSettings(settings) {
    const result = await request('configuracion', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ umbrales_humedad: { minimo: settings.min, maximo: settings.max }, tiempo_maximo_riego_segundos: settings.seconds }),
    })
    const applied = normalizeSettings(result)
    setData(current => ({ ...current, settings: applied }))
    return true
  }

  async function toggleIrrigation() {
    const result = await request('comando', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: crypto.randomUUID(), accion: data.pumpActive ? 'detener' : 'iniciar' }),
    })
    setData(current => ({ ...current, command: result.comando }))
    setRetry(value => value + 1)
  }

  return {
    ...data, now, source: 'api', active: data.pumpActive,
    refresh: () => setRetry(value => value + 1), updateSettings, toggleIrrigation,
  }
}
