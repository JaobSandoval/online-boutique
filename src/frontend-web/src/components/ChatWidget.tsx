import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getChatHistory, getOrCreateSession, sendChatMessage } from '../api/supportClient'
import type { ChatMessage } from '../api/types'
import { ChatIcon, CloseIcon } from './Icons'

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || sessionId) return
    getOrCreateSession()
      .then(async (id) => {
        setSessionId(id)
        setMessages(await getChatHistory(id))
      })
      .catch(() => undefined)
  }, [open, sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending || !sessionId) return
    setInput('')
    setMessages((prev) => [...prev, { senderRole: 'user', content: text, createdAt: new Date().toISOString() }])
    setSending(true)
    try {
      const reply = await sendChatMessage(sessionId, text)
      setMessages((prev) => [...prev, { senderRole: 'bot', content: reply, createdAt: new Date().toISOString() }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { senderRole: 'bot', content: 'Lo siento, ocurrió un error. Intenta de nuevo.', createdAt: new Date().toISOString() },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div>
              <strong>Asistente Online Boutique</strong>
              <span className="chat-subtitle">Te ayudo a encontrar productos y resolver dudas</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar chat">
              <CloseIcon size={18} />
            </button>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message chat-message-${m.senderRole}`}>
                {renderWithLinks(m.content)}
              </div>
            ))}
            {sending && <div className="chat-message chat-message-bot">Escribiendo…</div>}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu pregunta…"
              disabled={!sessionId}
            />
            <button onClick={handleSend} disabled={sending || !sessionId}>
              Enviar
            </button>
          </div>
        </div>
      )}
      <button className="chat-toggle" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Cerrar ayuda' : 'Abrir ayuda'}>
        {open ? <CloseIcon size={20} /> : <ChatIcon size={20} />}
        <span>{open ? 'Cerrar' : 'Ayuda'}</span>
      </button>
    </div>
  )
}

// El asistente sugiere productos con enlaces internos (/product/<id>, /cart);
// se convierten en <Link> para navegar sin recargar la página.
const INTERNAL_LINK = /(\/product\/[A-Za-z0-9]+|\/cart\b)/g

function renderWithLinks(text: string) {
  return text.split(INTERNAL_LINK).map((part, i) =>
    i % 2 === 1 ? (
      <Link key={i} to={part} className="chat-link">
        {part.startsWith('/cart') ? 'Ver carrito' : 'Ver producto'}
      </Link>
    ) : (
      part
    )
  )
}
