import { useEffect, useRef, useState } from 'react'
import { getChatHistory, sendChatMessage } from '../api/supportClient'
import type { ChatMessage } from '../api/types'

const SESSION_STORAGE_KEY = 'ob_chat_session_id'

function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  }
  return sessionId
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const sessionId = useRef(getOrCreateSessionId())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    getChatHistory(sessionId.current)
      .then(setMessages)
      .catch(() => undefined)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages((prev) => [...prev, { senderRole: 'user', content: text, createdAt: new Date().toISOString() }])
    setSending(true)
    try {
      const reply = await sendChatMessage(sessionId.current, text)
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
            <span>Soporte Online Boutique</span>
            <button onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message chat-message-${m.senderRole}`}>
                {m.content}
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
            />
            <button onClick={handleSend} disabled={sending}>
              Enviar
            </button>
          </div>
        </div>
      )}
      <button className="chat-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Cerrar' : '💬 Ayuda'}
      </button>
    </div>
  )
}
