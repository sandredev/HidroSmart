export function todayRange(now = Date.now()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const from = new Date(day + 'T00:00:00-05:00')
  return { desde: from.toISOString(), hasta: new Date(from.getTime() + 86400000).toISOString() }
}

export function normalizeSettings(data) {
  const config = data?.configuracion ?? data
  const min = config?.umbrales_humedad?.minimo ?? config?.humedad_minima
  const max = config?.umbrales_humedad?.maximo ?? config?.humedad_maxima
  const seconds = config?.tiempo_maximo_riego_segundos
  if (![min, max, seconds].every(n => typeof n === 'number' && Number.isFinite(n)) || min < 0 || max > 100 || min >= max || seconds <= 0) {
    throw new Error('La configuración recibida tiene campos incompletos o inválidos.')
  }
  return { min, max, seconds, plants: null }
}

export function normalizeReading(value) {
  if (!value || value.valida !== true || typeof value.humedad !== 'number' || !Number.isFinite(value.humedad)) return null
  const at = Date.parse(value.fecha_medicion)
  return Number.isFinite(at) ? { at, humidity: value.humedad } : null
}

export function normalizeEvents(data) {
  if (!Array.isArray(data?.riegos)) throw new Error('El historial de riegos tiene un formato diferente del contrato.')
  return data.riegos.map((event, index) => {
    const at = Date.parse(event.fecha_inicio)
    if (!Number.isFinite(at)) throw new Error('Hay un riego sin fecha de inicio válida.')
    const end = event.fecha_fin == null ? null : Date.parse(event.fecha_fin)
    if (end !== null && (!Number.isFinite(end) || end < at)) throw new Error('Hay un riego con fecha de fin inválida.')
    return {
      id: event.evento_id ?? String(index), at, end,
      seconds: typeof event.duracion_segundos === 'number' && event.duracion_segundos >= 0 ? event.duracion_segundos : null,
      reason: { automatico: 'Automático', manual: 'Manual', seguridad: 'Seguridad' }[event.motivo] ?? event.motivo ?? 'Sin motivo',
      volume: typeof event.volumen === 'number' && event.volumen >= 0 ? event.volumen : null,
      volumeType: event.tipo_volumen ?? null,
    }
  }).sort((a, b) => b.at - a.at)
}
