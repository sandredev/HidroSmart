import { useEffect, useRef, useState } from 'react'
import { faArrowRight, faArrowUp, faPlus, faStop } from '@fortawesome/free-solid-svg-icons'
import { Icon, PageIntro } from '../components/Interface.jsx'
import { formatNumber, formatTime } from '../lib/demo.js'
import { maxQuestionLength } from '../lib/hidroai.js'

const questions = [
  '¿Cómo está la humedad del suelo?',
  '¿Qué pasó con el último riego?',
  '¿Cómo interpreto los ajustes de la prueba?',
]

function TrialContext({ demo }) {
  const { reading, settings, scenario, active } = demo
  const known = demo.source === 'api' ? demo.pumpActive !== null : scenario === 'normal'
  const pump = known ? active ? 'En curso' : 'Detenido' : 'Estado desconocido'
  return (
    <aside className="chat-context" aria-labelledby="datos-prueba">
      <h2 id="datos-prueba">Datos de la prueba</h2>
      <dl>
        <div>
          <dt>Humedad del suelo</dt>
          <dd>{reading ? `${formatNumber(reading.humidity)}%` : 'Sin lectura'}</dd>
          {reading && <dd className="chat-context-detail">{scenario === 'offline' ? 'Lectura anterior' : 'Lectura'} de las {formatTime(reading.at)}</dd>}
        </div>
        <div>
          <dt>Rango configurado</dt>
          <dd>{settings.min == null ? 'Sin configuración' : `${formatNumber(settings.min)}–${formatNumber(settings.max)}%`}</dd>
        </div>
        <div><dt>Riego</dt><dd>{pump}</dd></div>
        <div><dt>Sensores</dt><dd>1</dd></div>
      </dl>
    </aside>
  )
}

function Turn({ turn, onRetry }) {
  return (
    <li className="chat-turn">
      <div className="chat-question"><strong>Tú</strong><p>{turn.question}</p></div>
      <div className="chat-reply">
        <strong>HidroAI</strong>
        {turn.status === 'pending' && <p role="status" className="chat-wait">Preparando la respuesta…</p>}
        {turn.status === 'complete' && <p>{turn.answer}</p>}
        {turn.status === 'error' && <p role="alert" className="form-error">{turn.error}</p>}
        {turn.status === 'stopped' && <p className="chat-wait">Respuesta detenida.</p>}
        {onRetry && <button className="chat-text-button" type="button" onClick={onRetry}>Reintentar</button>}
      </div>
    </li>
  )
}

export default function Asistente({ demo, chat }) {
  const [draft, setDraft] = useState('')
  const transcript = useRef(null)
  const input = useRef(null)
  const { turns, send, stop, reset, pending } = chat

  useEffect(() => {
    const log = transcript.current
    if (log) log.scrollTop = log.scrollHeight
  }, [turns])

  function submit(event) {
    event.preventDefault()
    if (!draft.trim() || pending) return
    void send(draft)
    setDraft('')
  }

  function submitOnEnter(event) {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form.requestSubmit()
  }

  function newChat() {
    reset()
    setDraft('')
    input.current?.focus()
  }

  return (
    <>
      <PageIntro title="HidroAI" description="Consulta la humedad, los riegos y los ajustes de tu prueba." />
      <div className="assistant">
        <section className="chat" aria-labelledby="conversacion">
          <header className="chat-header">
            <h2 id="conversacion">Conversación</h2>
            {turns.length > 0 && (
              <button type="button" className="chat-text-button" onClick={newChat}>
                <Icon icon={faPlus} /> Nueva conversación
              </button>
            )}
          </header>
          {turns.length === 0 ? (
            <div className="chat-empty">
              <h3>¿Qué quieres consultar?</h3>
              <div className="suggestions">
                {questions.map((question) => (
                  <button key={question} type="button" onClick={() => void send(question)}>
                    {question}<Icon icon={faArrowRight} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={transcript} className="chat-log" role="log" aria-label="Mensajes">
              <ol role="list">
                {turns.map((turn, index) => (
                  <Turn key={turn.id} turn={turn} onRetry={
                    index === turns.length - 1 && ['error', 'stopped'].includes(turn.status)
                      ? () => void send(turn.question, turn.id) : null
                  } />
                ))}
              </ol>
            </div>
          )}
          <form className="chat-compose" onSubmit={submit}>
            <label htmlFor="hidroai-question">Tu pregunta</label>
            <div className="chat-compose-row">
              <textarea id="hidroai-question" name="pregunta" ref={input} rows={2} maxLength={maxQuestionLength}
                placeholder="Escribe sobre tu prueba…" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={submitOnEnter} />
              {pending ? (
                <button type="button" className="button chat-cancel" onClick={stop}><Icon icon={faStop} /> Detener</button>
              ) : (
                <button type="submit" className="button button-water" disabled={!draft.trim()}><Icon icon={faArrowUp} /> Enviar</button>
              )}
            </div>
          </form>
        </section>
        <TrialContext demo={demo} />
      </div>
    </>
  )
}
