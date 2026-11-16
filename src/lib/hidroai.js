import { useEffect, useRef, useState } from 'react'

const maxTurnsForModel = 8
export const maxQuestionLength = 1000

const scenarioLabels = {
  normal: 'Operación normal',
  offline: 'Sin conexión. La lectura, si existe, es anterior a la desconexión.',
  empty: 'Sin datos',
  error: 'Error de comunicación',
  loading: 'Consultando el dispositivo',
}

function buildDemoContext(demo) {
  const { settings, reading, scenario, active, events } = demo
  return {
    escenario: scenarioLabels[scenario],
    zona_horaria: 'America/Bogota',
    plantas: settings.plants,
    rango_relativo_pct: [settings.min, settings.max],
    limite_riego_segundos: settings.seconds,
    lectura: reading ? { humedad_relativa_pct: reading.humidity, fecha: new Date(reading.at).toISOString() } : null,
    bomba_activa: scenario === 'normal' ? Boolean(active) : null,
    riegos_registrados_hoy: events.length ? events.length : scenario === 'normal' ? 0 : null,
    ultimos_riegos: events.slice(0, 8).map(({ at, reason, seconds, plants, volume }) => ({
      inicio: new Date(at).toISOString(), motivo: reason, duracion_segundos: seconds,
      plantas: plants, agua_estimada_litros: volume ?? null,
    })),
  }
}

async function askHidroAi(question, demo, turns, signal) {
  const response = await fetch('/api/hidroai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      pregunta: question,
      contexto_demo: buildDemoContext(demo),
      turnos: turns.filter((turn) => turn.answer).slice(-maxTurnsForModel)
        .map(({ question, answer }) => ({ pregunta: question, respuesta: answer })),
    }),
  })
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('El servicio de HidroAI no responde. Intenta de nuevo.')
  }
  const result = await response.json().catch(() => null)
  if (!response.ok || typeof result?.data?.respuesta !== 'string') {
    throw new Error(result?.error?.mensaje || 'No se pudo obtener una respuesta. Intenta de nuevo.')
  }
  return result.data.respuesta
}

export function useHidroAi(demo) {
  const [turns, setTurns] = useState([])
  const activeRequest = useRef(null)
  const nextId = useRef(0)

  useEffect(() => () => activeRequest.current?.controller.abort(), [])

  function finishTurn(id, result) {
    setTurns((previous) => previous.map((turn) => turn.id === id ? { ...turn, ...result } : turn))
  }

  async function send(value, retryId) {
    const question = value.trim()
    if (!question || question.length > maxQuestionLength || activeRequest.current) return
    const id = retryId ?? ++nextId.current
    const controller = new AbortController()
    const request = { id, controller }
    activeRequest.current = request
    if (retryId != null) {
      finishTurn(id, { status: 'pending', error: null })
    } else {
      setTurns((previous) => [...previous, { id, question, status: 'pending' }])
    }

    try {
      const answer = await askHidroAi(question, demo, turns, controller.signal)
      if (activeRequest.current === request) finishTurn(id, { status: 'complete', answer })
    } catch (error) {
      if (activeRequest.current === request) {
        const message = error instanceof TypeError ? 'No se pudo conectar con HidroAI. Revisa la conexión e inténtalo de nuevo.' : error.message
        finishTurn(id, { status: 'error', error: message })
      }
    } finally {
      if (activeRequest.current === request) activeRequest.current = null
    }
  }

  function stop() {
    const request = activeRequest.current
    if (!request) return
    activeRequest.current = null
    request.controller.abort()
    finishTurn(request.id, { status: 'stopped' })
  }

  function reset() {
    stop()
    setTurns([])
  }

  return { turns, send, stop, reset, pending: turns.at(-1)?.status === 'pending' }
}
