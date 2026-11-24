export const readRoutes = {
  estado: 'obtener-estado',
  configuracion: 'obtener-configuracion',
  ultima: 'obtener-ultima-medicion',
  mediciones: 'obtener-historial-mediciones',
  riegos: 'obtener-historial-riegos',
  contexto: 'obtener-contexto-hidroai',
}

export class ApiError extends Error {
  constructor(message, status = 502, code = 'RESPUESTA_INVALIDA') {
    super(message)
    this.status = status
    this.code = code
  }
}

export function createSupabaseClient(env, fetchApi = fetch) {
  return async function call(name, { method = 'GET', query, body, signal, operator = false } = {}) {
    const local = Boolean(env.HIDROSMART_API_URL)
    const rawBase = env.HIDROSMART_API_URL || env.SUPABASE_BASEURL || (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '') + '/functions/v1'
    const key = (local ? env.HIDROSMART_API_KEY : env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '')?.trim()
    const operatorToken = (env.HIDROSMART_OPERATOR_TOKEN || env.SUPABASE_OPERATOR_TOKEN || '')?.trim()
    if (!key) throw new ApiError(local ? 'Falta configurar la clave de la API local.' : 'Falta configurar la publishable key de Supabase en el servidor.', 503, 'API_SIN_CONFIGURAR')
    if (operator && !local && !operatorToken) throw new ApiError('Falta configurar el token de operador de Supabase en el servidor.', 503, 'OPERADOR_SIN_CONFIGURAR')
    let url
    try {
      url = new URL(rawBase.replace(/\/+$/, '') + '/' + name)
      const localHost = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(url.hostname)
      if (url.username || url.password || (local ? !localHost || !['http:', 'https:'].includes(url.protocol) : url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co'))) throw new Error()
    } catch {
      throw new ApiError('Revisa la URL de la API en el servidor.', 503, 'API_URL_INVALIDA')
    }
    if (query) url.search = query.toString()
    if (!local) url.searchParams.set('dispositivo_id', env.SUPABASE_DEVICE_ID || env.HIDROSMART_DEVICE_ID || 'esp8266-cultivo-01')
    let response
    try {
      response = await fetchApi(url, {
        method, headers: {
          apikey: key,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(operator && !local ? { 'x-operator-token': operatorToken } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
        redirect: 'error',
      })
    } catch {
      throw new ApiError(local ? 'No se pudo conectar con la API local. Inicia el servidor e inténtalo de nuevo.' : 'No se pudo conectar con Supabase. Comprueba que el proyecto esté activo y que la URL sea correcta.', 503, 'API_NO_DISPONIBLE')
    }
    const json = await response.json().catch(() => null)
    if (!response.ok || json?.ok === false) {
      const status = [400, 401, 403, 404, 409, 422, 429].includes(response.status) ? response.status : 502
      throw new ApiError(`La función ${name} rechazó la consulta (HTTP ${response.status}).`, status, 'SUPABASE_RECHAZO')
    }
    if (json?.ok !== true || !Object.hasOwn(json, 'data')) {
      throw new ApiError(`La función ${name} devolvió un formato diferente del contrato.`)
    }
    return json.data
  }
}

export function apiErrorResponse(error) {
  return Response.json({ ok: false, error: {
    codigo: error.code || 'ERROR_INTERNO',
    mensaje: error instanceof ApiError ? error.message : 'No se pudo procesar la solicitud.',
  } }, { status: error.status || 500, headers: { 'Cache-Control': 'no-store' } })
}

export function createFarmHandler(env, fetchApi = fetch) {
  const call = createSupabaseClient(env, fetchApi)
  return async (request) => {
    const resource = new URL(request.url).pathname.split('/').at(-1)
    const local = Boolean(env.HIDROSMART_API_URL)
    const command = resource === 'comando'
    const name = command ? 'crear-comando-riego' : readRoutes[resource]
    try {
      if (!name) throw new ApiError('Ruta desconocida.', 404, 'NO_ENCONTRADO')
      if (command && request.method !== 'POST') throw new ApiError('Método no permitido.', 405, 'METODO_NO_PERMITIDO')
      if (request.method === 'GET') {
        const query = new URLSearchParams()
        const params = new URL(request.url).searchParams
        for (const field of ['desde', 'hasta', 'limite', ...(local ? ['offset'] : ['pagina'])]) {
          if (params.has(field)) query.set(field, params.get(field))
        }
        const data = await call(name, { query, signal: request.signal })
        const normalized = !local && resource === 'estado' ? {
          ...data,
          comandos_disponibles: env.SUPABASE_COMMANDS_ENABLED === 'true'
            && Boolean((env.HIDROSMART_OPERATOR_TOKEN || env.SUPABASE_OPERATOR_TOKEN || '').trim()),
        } : data
        return Response.json({ ok: true, data: normalized }, { headers: { 'Cache-Control': 'no-store' } })
      }
      if (!((resource === 'configuracion' && request.method === 'PUT') || (command && request.method === 'POST'))) {
        throw new ApiError('Método no permitido.', 405, 'METODO_NO_PERMITIDO')
      }
      if (request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError('Origen no permitido.', 403, 'NO_AUTORIZADO')
      if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError('Usa JSON.', 415, 'FORMATO_INVALIDO')
      const text = await request.text()
      if (text.length > 1024) throw new ApiError('Solicitud demasiado grande.', 413, 'DATOS_INVALIDOS')
      const input = JSON.parse(text)
      if (command) {
        if (!['iniciar', 'detener'].includes(input?.accion) || typeof input.id !== 'string' || input.id.length > 100) throw new ApiError('Comando inválido.', 422, 'DATOS_INVALIDOS')
        if (!local && env.SUPABASE_COMMANDS_ENABLED !== 'true') {
          throw new ApiError('El control manual se habilitará cuando el dispositivo pueda confirmar órdenes.', 503, 'COMANDOS_DESHABILITADOS')
        }
        const body = local
          ? { id: input.id, accion: input.accion }
          : { dispositivo_id: env.SUPABASE_DEVICE_ID || env.HIDROSMART_DEVICE_ID, accion: input.accion === 'iniciar' ? 'iniciar_riego' : 'detener_riego' }
        const data = await call(name, { method: 'POST', body, operator: !local, signal: request.signal })
        return Response.json({ ok: true, data }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
      }
      const min = input?.umbrales_humedad?.minimo
      const max = input?.umbrales_humedad?.maximo
      const seconds = input?.tiempo_maximo_riego_segundos
      if (![min, max].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100) || min >= max || !Number.isInteger(seconds) || seconds <= 0 || seconds > 300) {
        throw new ApiError('Revisa los umbrales y el tiempo máximo de riego.', 422, 'DATOS_INVALIDOS')
      }
      const body = local ? {
        umbrales_humedad: { minimo: min, maximo: max }, tiempo_maximo_riego_segundos: seconds,
      } : {
        dispositivo_id: env.SUPABASE_DEVICE_ID || env.HIDROSMART_DEVICE_ID,
        humedad_minima: min,
        humedad_maxima: max,
        tiempo_maximo_riego_segundos: seconds,
      }
      const data = await call('actualizar-configuracion', { method: 'PUT', body, operator: !local, signal: request.signal })
      return Response.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
      return apiErrorResponse(error instanceof SyntaxError ? new ApiError('JSON inválido.', 400, 'JSON_INVALIDO') : error)
    }
  }
}
