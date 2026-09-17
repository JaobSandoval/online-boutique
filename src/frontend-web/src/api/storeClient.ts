import axios from 'axios'
import { tokenStore } from './tokenStore'
import type { CartItem, Product } from './types'

const baseURL = import.meta.env.VITE_STORE_API_BASE_URL

// withCredentials so the anonymous shop_session-id cookie (set by the Go
// frontend's ensureSessionID middleware) flows through, keeping guest carts
// working exactly as they did before this API existed.
export const storeClient = axios.create({ baseURL, withCredentials: true })

storeClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function listProducts(): Promise<Product[]> {
  const { data } = await storeClient.get<Product[]>('/products')
  return data
}

export async function getProduct(id: string): Promise<Product> {
  const { data } = await storeClient.get<Product>(`/products/${id}`)
  return data
}

export async function getRecommendations(productIds: string[]): Promise<Product[]> {
  const { data } = await storeClient.get<Product[]>('/recommendations', {
    params: { productIds: productIds.join(',') },
  })
  return data
}

export async function getCart(): Promise<CartItem[]> {
  const { data } = await storeClient.get<CartItem[]>('/cart')
  return data
}

export async function addToCart(productId: string, quantity: number): Promise<void> {
  await storeClient.post('/cart', { productId, quantity })
}

export async function emptyCart(): Promise<void> {
  await storeClient.post('/cart/empty')
}

export async function getCurrencies(): Promise<string[]> {
  const { data } = await storeClient.get<string[]>('/currencies')
  return data
}

export interface CheckoutPayload {
  email: string
  streetAddress: string
  city: string
  state: string
  country: string
  zipCode: number
  creditCardNumber: string
  creditCardExpirationMonth: number
  creditCardExpirationYear: number
  creditCardCvv: number
  currency: string
}

export async function checkout(payload: CheckoutPayload): Promise<{ orderId: string }> {
  const { data } = await storeClient.post<{ orderId: string }>('/checkout', payload)
  return data
}
