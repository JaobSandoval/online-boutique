import axios from 'axios'
import { attachAuthInterceptors } from './authRefresh'
import type { Ad, CartItem, CartQuote, OrderResult, Product, StoreInfo } from './types'

const baseURL = import.meta.env.VITE_STORE_API_BASE_URL

export const storeClient = axios.create({ baseURL, withCredentials: true })
attachAuthInterceptors(storeClient)

// Moneda elegida por el usuario: se manda como ?currency= en cada petición
// y el backend devuelve los precios ya convertidos por currencyservice.
let currentCurrency = 'USD'
export function setStoreCurrency(code: string) {
  currentCurrency = code
}
storeClient.interceptors.request.use((config) => {
  config.params = { currency: currentCurrency, ...config.params }
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

export async function checkout(payload: CheckoutPayload): Promise<OrderResult> {
  const { data } = await storeClient.post<OrderResult>('/checkout', payload)
  return data
}

export async function getCartQuote(): Promise<CartQuote> {
  const { data } = await storeClient.get<CartQuote>('/cart/quote')
  return data
}

export async function getAd(categories: string[] = []): Promise<Ad | null> {
  const res = await storeClient.get<Ad>('/ads', { params: { categories: categories.join(',') } })
  return res.status === 204 || !res.data ? null : res.data
}

export async function getStoreInfo(): Promise<StoreInfo> {
  const { data } = await storeClient.get<StoreInfo>('/store-info')
  return data
}
