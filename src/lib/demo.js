import { useEffect, useState } from 'react'

const storageKey = 'hidrosmart-prototype-config-v1'
const locale = 'es-CO'
const timeZone = 'America/Bogota'
const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone })
const calendar = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone })
const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })

export const formatTime = (time) => clock.format(time)
export const formatDate = (time) => calendar.format(time)
export const formatNumber = (value) => number.format(value)

export const defaultSettings = { min: 60, max: 80, seconds: 60, plants: 3 }

export function validateSettings({ min, max, seconds, plants }) {
  if (![min, max].every((value) => Number.isFinite(value) && value >= 0 && value <= 100) || min >= max) {
    return 'Ingresa dos umbrales entre 0 y 100. El mínimo debe ser menor que el máximo.'
  }
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 300) {
    return 'Ingresa un tiempo máximo de 1 a 300 segundos.'
  }
  if (!Number.isInteger(plants) || plants < 1 || plants > 3) {
    return 'Ingresa una cantidad de 1 a 3 plantas.'
  }
  return ''
}

function readSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(storageKey))
    if (settings && !validateSettings(settings)) return settings
  } catch {
    // The demo also works without access to browser storage.
  }
  return defaultSettings
}

function buildExample(now) {
  const parts = Object.fromEntries(clock.formatToParts(now).map(({ type, value }) => [type, value]))
  const midnight = new Date(now).setUTCSeconds(0, 0) - (+parts.hour * 60 + +parts.minute) * 60_000
  const pointAt = (fraction) => Math.round(midnight + (now - midnight) * fraction)
  return {
    points: [70, 67, 64, 60, 58, 74, 78, 73, 67, 62, 59, 76, 79, 75, 72, 69, 68.4].map((humidity, i) => ({
      at: pointAt(i / 16), humidity,
    })),
    events: [
      { id: 'example-2', at: pointAt(10 / 16), seconds: 48, reason: 'Automático', volume: 0.3, plants: 3 },
      { id: 'example-1', at: pointAt(4 / 16), seconds: 42, reason: 'Automático', volume: 0.28, plants: 3 },
    ].filter((event) => event.at + event.seconds * 1000 <= now),
  }
}

export function useDemo() {
  const [now] = useState(Date.now)
  const [example] = useState(() => buildExample(now))
  const [settings, setSettings] = useState(readSettings)
  const [scenario, setScenario] = useState('normal')
  const [manualEvents, setManualEvents] = useState([])
  const active = manualEvents[0]?.seconds === null ? manualEvents[0] : null

  useEffect(() => {
    if (!active) return
    const delay = Math.max(0, active.at + active.limit * 1000 - Date.now())
    const timer = setTimeout(() => {
      setManualEvents((events) => {
        const first = events[0]
        if (first?.id !== active.id || first.seconds !== null) return events
        return [{ ...first, seconds: first.limit }, ...events.slice(1)]
      })
    }, delay)
    return () => clearTimeout(timer)
  }, [active])

  function updateSettings(next) {
    if (validateSettings(next)) return false
    setSettings(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      return true
    } catch {
      return false
    }
  }

  function toggleIrrigation() {
    if (scenario !== 'normal') return
    const at = Date.now()
    setManualEvents((events) => {
      const first = events[0]
      if (first?.seconds === null) {
        const seconds = Math.min(first.limit, Math.max(0, Math.round((at - first.at) / 1000)))
        return [{ ...first, seconds }, ...events.slice(1)]
      }
      return [{ id: String(at), at, seconds: null, limit: settings.seconds, reason: 'Manual', plants: settings.plants }, ...events]
    })
  }

  const missing = scenario === 'empty' || scenario === 'error' || scenario === 'loading'
  const points = scenario === 'offline' ? example.points.filter(({ at }) => at <= now - 900_000) : example.points
  const reading = points.at(-1)
  return {
    now, settings, updateSettings, scenario, setScenario, toggleIrrigation, active,
    points: missing ? [] : points,
    reading: missing ? null : reading ?? null,
    events: missing ? [] : [...manualEvents, ...example.events],
  }
}
