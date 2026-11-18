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
  /** priceUsd convertido a la moneda elegida (currencyservice). */
  price?: Money
  categories: string[]
}

export interface PricedLine {
  productId: string
  quantity: number
  unitPrice: Money
  lineTotal: Money
}

export interface CartQuote {
  currency: string
  items: PricedLine[]
  subtotal: Money
  shippingCost: Money
  total: Money
}

export interface OrderResult {
  orderId: string
  shippingTrackingId: string
  shippingCost: Money
  totalPaid: Money
  items: PricedLine[]
}

export interface Ad {
  redirectUrl: string
  text: string
}

export interface StoreInfo {
  message: string
  defaultCurrency: string
  deployment: { hostname?: string; clustername?: string; zone?: string }
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
