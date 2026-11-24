import { EmptyState, PageIntro } from '../components/Interface.jsx'
import { formatDate, formatNumber, formatTime } from '../lib/demo.js'

function Event({ event }) {
  const { at, seconds, reason, volume, plants, end, volumeType, volumeUnit } = event
  const inProgress = end === undefined ? seconds === null : end === null
  return (
    <li className="irrigation-event">
      <div className="event-start">
        <time dateTime={new Date(at).toISOString()}>{formatTime(at)}</time>
        <span>{reason}</span>
      </div>
      <dl className="event-data">
        <div>
          <dt>Fin</dt>
          <dd>{inProgress ? <span className="event-progress">En curso</span> : formatTime(end ?? at + seconds * 1000)}</dd>
        </div>
        <div><dt>Duración</dt><dd>{seconds == null ? '—' : `${seconds} s`}</dd></div>
        {plants != null && <div><dt>Plantas</dt><dd>{plants}</dd></div>}
        <div><dt>{volumeType === 'medido' ? 'Agua medida' : volumeType === 'estimado' || plants != null ? 'Agua estimada' : 'Volumen'}</dt><dd>{volume == null ? '—' : formatNumber(volume) + (volumeUnit === 'litros' || plants != null ? ' L' : '')}</dd></div>
      </dl>
    </li>
  )
}

export default function Historial({ demo }) {
  return (
    <>
      <PageIntro title="Historial de riego" description={formatDate(demo.now)} />
      <section className="event-log" aria-labelledby="riegos-dia">
        <div className="section-rule">
          <h2 id="riegos-dia">Riegos de hoy</h2>
          {demo.events.length > 0 && <span>Más recientes primero</span>}
        </div>
        {demo.events.length ? (
          <ol className="event-list" role="list">{demo.events.map((event) => <Event key={event.id} event={event} />)}</ol>
        ) : <EmptyState scenario={demo.scenario} fallback="Aún no hay riegos registrados hoy." />}
      </section>
    </>
  )
}
