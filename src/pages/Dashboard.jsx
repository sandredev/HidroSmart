import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { faArrowRight, faDroplet, faPowerOff, faWifi } from '@fortawesome/free-solid-svg-icons'
import { EmptyState, Icon, PageIntro } from '../components/Interface.jsx'
import { formatDate, formatNumber, formatTime } from '../lib/demo.js'

const connectionLabels = {
  normal: 'Conexión simulada', offline: 'Sin conexión', empty: 'Sin comunicación',
  uncalibrated: 'Dispositivo conectado', error: 'Error de comunicación', loading: 'Consultando estado…',
}

function Moisture({ demo }) {
  const { reading, scenario, settings } = demo
  const humidity = reading?.humidity
  const range = settings.min == null ? 'Configuración no disponible' : humidity < settings.min
    ? 'Por debajo del mínimo'
    : humidity > settings.max ? 'Por encima del máximo' : 'En el rango configurado'

  return (
    <section className="moisture" aria-labelledby="humedad">
      <div className="moisture-heading">
        <h2 id="humedad">Humedad del suelo</h2>
        <span className="device-label">Sensor · Escala relativa</span>
      </div>
      {reading ? (
        <div className="readout">
          <span className="moisture-value">{formatNumber(humidity)}<span>%</span></span>
          <div className="reading-details">
            <p className="reading-range">
              {scenario === 'offline' ? 'Última lectura disponible' : range}
            </p>
            <p className="reading-time">Lectura de las <time dateTime={new Date(reading.at).toISOString()}>{formatTime(reading.at)}</time></p>
          </div>
        </div>
      ) : <EmptyState scenario={scenario} fallback="Todavía no hay una lectura válida." />}
    </section>
  )
}

function Pump({ demo }) {
  const [sending, setSending] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [stopRequested, setStopRequested] = useState(false)
  const [error, setError] = useState('')
  const { active, scenario, toggleIrrigation, settings } = demo
  const available = demo.source === 'demo' ? scenario === 'normal' : demo.commandsAvailable && demo.pumpActive !== null
  const pending = demo.command?.estado === 'pendiente'
  async function sendCommand() {
    if (sending || pending) return
    setSending(true)
    setError('')
    setStopRequested(false)
    try { await toggleIrrigation('iniciar') } catch (cause) { setError(cause.message) }
    finally { setSending(false) }
  }
  async function stopIrrigation() {
    if (stopping) return
    setStopping(true)
    setError('')
    try { await toggleIrrigation('detener'); setStopRequested(true) }
    catch (cause) { setError(cause.message) }
    finally { setStopping(false) }
  }
  const known = demo.source === 'api' ? demo.pumpActive !== null : scenario === 'normal'
  const running = known && Boolean(active)
  const label = known ? running ? 'Riego en curso' : 'Riego detenido' : 'Estado desconocido'
  const details = running
    ? demo.source === 'demo' ? `Inicio a las ${formatTime(active.at)}. Límite de este ciclo: ${active.limit} s.` : 'Estado informado por el dispositivo.'
    : settings.seconds == null ? 'Límite de riego no disponible.' : `Límite configurado: ${settings.seconds} s por ciclo.`

  return (
    <section className="pump" aria-labelledby="bomba">
      <div className="pump-controls">
        <h2 id="bomba">Control de riego</h2>
        <p className="pump-status" data-state={available ? running ? 'active' : 'idle' : 'unknown'} role="status">
          <span className="dot" />{label}
        </p>
        <p className="pump-details">{details}</p>
        <button type="button" className="button button-water" disabled={!available || running || sending || stopping || pending} onClick={sendCommand}>
          <Icon icon={faDroplet} /> {sending ? 'Enviando inicio…' : 'Iniciar riego'}
        </button>
        <button type="button" className="button button-stop" disabled={stopping || (demo.source === 'demo' ? scenario !== 'normal' : !demo.commandsAvailable)} onClick={stopIrrigation}>
          <Icon icon={faPowerOff} /> {stopping ? 'Enviando parada…' : 'Detener riego'}
        </button>
        {stopRequested && <p className="pump-note" role="status">Parada solicitada. Comprueba que el dispositivo informe riego detenido.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {demo.command && <p className="pump-note" role="status">{({ pendiente: 'Orden pendiente de confirmación.', ejecutada: 'Orden confirmada por el dispositivo.', rechazada: 'El dispositivo rechazó la orden.', vencida: 'La orden venció sin confirmación.', cancelada: 'Orden cancelada.' })[demo.command.estado]}</p>}
        {!available && <p className="pump-note">{demo.source === 'api' && !demo.commandsAvailable ? 'Control manual pendiente de verificar en la API.' : 'Control manual no disponible'}</p>}
      </div>
      <div className="crop-photo">
        <img src="/cultivo-pepino.webp" width="900" height="600" alt="" />
      </div>
    </section>
  )
}

function MoistureChart({ points, settings, scenario, events }) {
  const last = points.at(-1)
  const visibleEvents = last ? events.filter(({ at }) => at >= points[0].at && at <= last.at) : []
  return (
    <section className="trend" aria-labelledby="tendencia">
      <div className="trend-heading">
        <h2 id="tendencia">Últimas lecturas de hoy</h2>
        <div className="chart-legend">
          {settings.min !== null && <span className="chart-key"><i aria-hidden="true" />Rango {formatNumber(settings.min)}–{formatNumber(settings.max)}%</span>}
          {visibleEvents.length > 0 && <span className="chart-key chart-key-event"><i aria-hidden="true" />Inicio de riego</span>}
        </div>
      </div>
      {last ? (
        <>
          <div className="chart" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart accessibilityLayer={false} data={points} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--grid-line)" />
                <XAxis dataKey="at" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} minTickGap={24} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <YAxis unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                {settings.min !== null && <ReferenceArea y1={settings.min} y2={settings.max} fill="var(--range)" fillOpacity={1} />}
                {settings.min !== null && <ReferenceLine y={settings.min} stroke="var(--range-edge)" strokeDasharray="3 4" />}
                {settings.max !== null && <ReferenceLine y={settings.max} stroke="var(--range-edge)" strokeDasharray="3 4" />}
                {visibleEvents.map(({ id, at }) => <ReferenceLine key={id} x={at} stroke="var(--water)" strokeDasharray="1 5" />)}
                <Tooltip labelFormatter={formatTime} formatter={(value) => [`${formatNumber(value)}%`, 'Humedad']} />
                <Line type="linear" dataKey="humidity" stroke="var(--ink-green)" strokeWidth={2.5} isAnimationActive={false}
                  dot={({ cx, cy, index }) => index === points.length - 1
                    ? <circle key={index} cx={cx} cy={cy} r={4} fill="var(--ink-green)" stroke="var(--paper)" strokeWidth={2} />
                    : null} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="chart-data">
            <summary>Ver valores de la gráfica</summary>
            <ul>{points.map(({ at, humidity }, i) => (
              <li key={i}><time dateTime={new Date(at).toISOString()}>{formatTime(at)}</time><strong>{formatNumber(humidity)}%</strong></li>
            ))}</ul>
            {visibleEvents.length > 0 && <p className="chart-events">Inicios de riego: {visibleEvents.map(({ at }) => formatTime(at)).reverse().join(', ')}.</p>}
          </details>
        </>
      ) : <EmptyState scenario={scenario} fallback="Aún no hay lecturas para graficar." />}
    </section>
  )
}

export default function Dashboard({ demo }) {
  const { events, now, scenario, settings } = demo
  const closed = events.filter((event) => event.seconds !== null)
  const volumes = closed.filter((event) => event.volume != null && (demo.source === 'demo' || event.volumeType === 'estimado' && event.volumeUnit === 'litros'))
  const volume = volumes.reduce((sum, event) => sum + event.volume, 0)

  return (
    <>
      <PageIntro title="Estado del cultivo" description={formatDate(now)}>
        <span className={`connection ${['normal', 'uncalibrated'].includes(scenario) ? 'connected' : ''}`} role="status">
          <Icon icon={faWifi} />{demo.source === 'api' && ['normal', 'uncalibrated'].includes(scenario) ? 'Dispositivo conectado' : connectionLabels[scenario]}
        </span>
      </PageIntro>
      <div className="overview">
        <Moisture demo={demo} />
        <Pump demo={demo} />
        <MoistureChart points={demo.points} scenario={scenario} settings={settings} events={events} />
      </div>
      <section className="day-summary" aria-labelledby="resumen-dia">
        <div className="day-summary-heading">
          <h2 id="resumen-dia">Resumen de hoy</h2>
          <Link className="text-link" to={'/historial' + (demo.source === 'demo' ? '?demo=1' : '')}>Ver historial <Icon icon={faArrowRight} /></Link>
        </div>
        <dl className="summary-strip">
          <div><dt>{demo.source === 'demo' ? 'Plantas en el ensayo' : 'Sensores'}</dt><dd>{demo.source === 'demo' ? settings.plants : 1}</dd></div>
          <div><dt>Riegos registrados</dt><dd>{['error', 'loading'].includes(scenario) ? '—' : events.length}</dd></div>
          <div><dt>Agua estimada</dt><dd>{volumes.length ? `${formatNumber(volume)} L` : '—'}</dd>
            {volumes.length > 0 && volumes.length < closed.length && <dd className="summary-note">Total parcial</dd>}
          </div>
        </dl>
      </section>
    </>
  )
}
import { useState } from 'react'
