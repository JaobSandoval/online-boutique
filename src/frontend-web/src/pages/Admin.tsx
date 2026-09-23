import { useEffect, useState } from 'react'
import {
  fetchAdminStats,
  fetchConversationMessages,
  fetchConversations,
  fetchTickets,
  updateTicketStatus,
  type AdminStats,
  type ConversationSummary,
  type Ticket,
} from '../api/adminClient'
import type { ChatMessage } from '../api/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

function ConversationRow({ conversation }: { conversation: ConversationSummary }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)

  async function toggle() {
    if (!open && messages === null) {
      setMessages(await fetchConversationMessages(conversation.conversationId))
    }
    setOpen((v) => !v)
  }

  return (
    <div className="admin-conversation">
      <button className="admin-conversation-header" onClick={toggle}>
        <span>{conversation.userId ?? '(sin usuario)'}</span>
        <span className="admin-conversation-preview">{conversation.lastMessagePreview}</span>
        <span>{conversation.messageCount} mensajes</span>
        <span>{formatDate(conversation.startedAt)}</span>
      </button>
      {open && messages && (
        <div className="admin-conversation-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-message chat-message-${m.senderRole}`}>
              {m.content}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TicketRow({ ticket, onUpdated }: { ticket: Ticket; onUpdated: (t: Ticket) => void }) {
  const [updating, setUpdating] = useState(false)

  async function handleChange(status: Ticket['status']) {
    setUpdating(true)
    try {
      onUpdated(await updateTicketStatus(ticket.ticketId, status))
    } finally {
      setUpdating(false)
    }
  }

  return (
    <tr>
      <td>{ticket.category}</td>
      <td>{ticket.description}</td>
      <td>{formatDate(ticket.createdAt)}</td>
      <td>
        <select value={ticket.status} onChange={(e) => handleChange(e.target.value as Ticket['status'])} disabled={updating}>
          <option value="open">Abierto</option>
          <option value="in_progress">En progreso</option>
          <option value="resolved">Resuelto</option>
        </select>
      </td>
    </tr>
  )
}

export function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchAdminStats(), fetchConversations(), fetchTickets()])
      .then(([s, c, t]) => {
        setStats(s)
        setConversations(c)
        setTickets(t)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="status-message">Cargando panel…</p>

  return (
    <div className="admin-page">
      <h1>Panel de soporte</h1>

      {stats && (
        <div className="admin-stats">
          <div className="admin-stat-card">
            <strong>{stats.totalConversations}</strong>
            <span>Conversaciones</span>
          </div>
          <div className="admin-stat-card">
            <strong>{stats.openTickets}</strong>
            <span>Tickets abiertos</span>
          </div>
          <div className="admin-stat-card">
            <strong>{stats.distinctUsers}</strong>
            <span>Usuarios atendidos</span>
          </div>
        </div>
      )}

      <h2>Tickets de soporte</h2>
      {tickets.length === 0 ? (
        <p className="status-message">No hay tickets todavía.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Creado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <TicketRow
                key={t.ticketId}
                ticket={t}
                onUpdated={(updated) => setTickets((prev) => prev.map((x) => (x.ticketId === updated.ticketId ? updated : x)))}
              />
            ))}
          </tbody>
        </table>
      )}

      <h2>Conversaciones recientes</h2>
      {conversations.length === 0 ? (
        <p className="status-message">Todavía no hay conversaciones.</p>
      ) : (
        <div className="admin-conversations">
          {conversations.map((c) => (
            <ConversationRow key={c.conversationId} conversation={c} />
          ))}
        </div>
      )}
    </div>
  )
}
