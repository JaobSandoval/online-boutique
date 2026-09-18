import { supportClient } from './supportClient'
import type { ChatMessage } from './types'

export interface ConversationSummary {
  conversationId: string
  sessionId: string
  userId: string | null
  startedAt: string
  status: string
  messageCount: number
  lastMessagePreview: string | null
}

export interface AdminStats {
  totalConversations: number
  openTickets: number
  distinctUsers: number
}

export interface Ticket {
  ticketId: string
  conversationId: string
  category: string
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  createdAt: string
  resolvedAt: string | null
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await supportClient.get('/admin/stats')
  return {
    totalConversations: data.total_conversations,
    openTickets: data.open_tickets,
    distinctUsers: data.distinct_users,
  }
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const { data } = await supportClient.get('/admin/conversations')
  return data.conversations.map((c: any) => ({
    conversationId: c.conversation_id,
    sessionId: c.session_id,
    userId: c.user_id,
    startedAt: c.started_at,
    status: c.status,
    messageCount: c.message_count,
    lastMessagePreview: c.last_message_preview,
  }))
}

export async function fetchConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await supportClient.get(`/admin/conversations/${conversationId}/messages`)
  return data.messages.map((m: any) => ({
    senderRole: m.sender_role,
    content: m.content,
    createdAt: m.created_at,
  }))
}

export async function fetchTickets(status?: string): Promise<Ticket[]> {
  const { data } = await supportClient.get('/admin/tickets', { params: status ? { status } : undefined })
  return data.tickets.map((t: any) => ({
    ticketId: t.ticket_id,
    conversationId: t.conversation_id,
    category: t.category,
    description: t.description,
    status: t.status,
    createdAt: t.created_at,
    resolvedAt: t.resolved_at,
  }))
}

export async function updateTicketStatus(ticketId: string, status: Ticket['status']): Promise<Ticket> {
  const { data } = await supportClient.patch(`/admin/tickets/${ticketId}`, { status })
  return {
    ticketId: data.ticket_id,
    conversationId: data.conversation_id,
    category: data.category,
    description: data.description,
    status: data.status,
    createdAt: data.created_at,
    resolvedAt: data.resolved_at,
  }
}
