export interface Money {
  currencyCode: string
  amount: string
}

export interface Product {
  id: string
  name: string
  description: string
  picture: string
  priceUsd: Money
  categories: string[]
}

export interface CartItem {
  productId: string
  quantity: number
}

export interface User {
  userId: string
  email: string
  displayName: string
  roles: string[]
  isActive: boolean
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface ChatMessage {
  senderRole: 'user' | 'bot'
  content: string
  createdAt: string
}
