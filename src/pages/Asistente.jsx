import { useState } from 'react'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { Icon, PageIntro } from '../components/Interface.jsx'
import { formatNumber, formatTime } from '../lib/demo.js'

const questions = [
  { topic: 'humedad', label: '¿Cómo está la humedad?' },
  { topic: 'riego', label: '¿Cuándo fue el último riego?' },
]

function demoAnswer(topic, demo) {
  if (topic === 'riego') {
    if (!demo.events.length) return 'No hay riegos disponibles en este escenario.'
    const last = demo.events[0]
    return `El último riego registrado comenzó a las ${formatTime(last.at)}. Motivo: ${last.reason.toLowerCase()}. ${last.seconds === null ? 'Sigue en curso en la demostración.' : `Duró ${last.seconds} s.`}`
  }
  if (!demo.reading) return 'No hay una lectura válida en este escenario.'
  const { humidity, at } = demo.reading
  return `La lectura de ejemplo de las ${formatTime(at)} fue de ${formatNumber(humidity)}% en la escala relativa. ${demo.scenario === 'offline' ? 'El dispositivo está sin conexión en este escenario.' : `El rango configurado va de ${formatNumber(demo.settings.min)}% a ${formatNumber(demo.settings.max)}%.`}`
}

export default function Asistente({ demo }) {
  const [topic, setTopic] = useState(null)
  return (
    <>
      <PageIntro title="HidroAI" description="Consulta la humedad y los riegos de tu cultivo." />
      <div className="assistant">
        <section className="assistant-queries" aria-labelledby="asistente-titulo">
          <h2 id="asistente-titulo">Consultas de ejemplo</h2>
          <div className="suggestions">
            {questions.map(({ topic: value, label }) => (
              <button key={value} type="button" aria-pressed={topic === value} onClick={() => setTopic(value)}>
                {label}<Icon icon={faArrowRight} />
              </button>
            ))}
          </div>
        </section>
        <section className="assistant-answer" aria-labelledby="asistente-respuesta">
          <h2 id="asistente-respuesta">Respuesta</h2>
          <div role="status">
            <p>{topic ? demoAnswer(topic, demo) : 'Elige una pregunta.'}</p>
          </div>
        </section>
      </div>
    </>
  )
}
