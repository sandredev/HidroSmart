export function evaluateReading(state, reading, minimum, now = Date.now()) {
  const next = { ...state }
  const at = Date.parse(reading?.fecha_medicion)
  if (!reading || !Number.isFinite(at) || at <= (state.lastAt ?? 0)) return next
  next.lastAt = at
  if (reading.valida !== true || reading.tipo_lectura !== 'calibrada' ||
      !Number.isFinite(reading.humedad) || reading.humedad < 0 || reading.humedad > 100 ||
      now - at > 90000 || at > now + 5000) {
    next.count = 0
    return next
  }
  if (at - (state.lastAt ?? at) > 90000 || state.minimum !== minimum) next.count = 0
  next.minimum = minimum
  if (reading.humedad >= minimum + 5) {
    next.count = 0
    next.latched = false
  } else if (reading.humedad < minimum) {
    next.count = (next.count ?? 0) + 1
    if (next.count >= 3 && !next.latched && !next.pending) {
      next.pending = {
        key: `soil-low/${crypto.randomUUID()}`,
        createdAt: now,
        humidity: reading.humedad, minimum, at: reading.fecha_medicion,
      }
      next.latched = true
    }
  } else next.count = 0
  return next
}

export async function sendAlert(env, alert, fetchApi = fetch) {
  if (!env.RESEND_API_KEY || !env.ALERT_EMAIL_TO) throw new Error('Faltan RESEND_API_KEY o ALERT_EMAIL_TO.')
  const response = await fetchApi('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': alert.key },
    body: JSON.stringify({
      from: env.ALERT_EMAIL_FROM || 'HidroSmart <onboarding@resend.dev>',
      to: [env.ALERT_EMAIL_TO],
      subject: 'HidroSmart: humedad por debajo del mínimo',
      text: `Humedad relativa: ${alert.humidity}%. Umbral mínimo: ${alert.minimum}%.\nMedición: ${alert.at}.\nSe detectaron tres lecturas bajas consecutivas. Revisa el suelo y la posición de la sonda: una sonda al aire también puede indicar 0%.\nModo de monitoreo: no se ha ordenado riego.`,
    }),
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || typeof result?.id !== 'string') throw new Error(`Resend no confirmó el envío (HTTP ${response.status}).`)
  return result.id
}
