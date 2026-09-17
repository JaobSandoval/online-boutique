import axios from 'axios'
import { tokenStore } from './tokenStore'
import type { ChatMessage } from './types'

const baseURL = import.meta.env.VITE_SUPPORT_API_BASE_URL

export const supportClient = axios.create({ baseURL })

supportClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function sendChatMessage(sessionId: string, message: string): Promise<string> {
  const { data } = await supportClient.post<{ session_id: string; content: string }>('/chat', {
    session_id: sessionId,
    message,
  })
  return data.content
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const { data } = await supportClient.get<{ session_id: string; messages: { sender_role: string; content: string; created_at: string }[] }>(
    `/chat/${sessionId}/history`
  )
  return data.messages.map((m) => ({
    senderRole: m.sender_role as 'user' | 'bot',
    content: m.content,
    createdAt: m.created_at,
  }))
}
