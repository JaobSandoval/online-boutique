import axios, { type AxiosInstance } from 'axios'
import { emitSessionExpired } from './authEvents'
import { tokenStore } from './tokenStore'

const accountBaseURL = import.meta.env.VITE_ACCOUNT_API_BASE_URL

// Shared across every axios client (account/store/support) so a 401 on any
// of them triggers at most one in-flight refresh — refresh tokens are
// single-use/rotating, so two independent refresh calls would make the
// second one fail by consuming an already-spent token.
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.getRefreshToken()
  if (!refreshToken) throw new Error('no refresh token')
  const { data } = await axios.post<{
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
  }>(`${accountBaseURL}/auth/refresh`, { refresh_token: refreshToken })
  tokenStore.setTokens(data.access_token, data.refresh_token)
  return data.access_token
}

export function attachAuthInterceptors(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    const token = tokenStore.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config
      if (error.response?.status === 401 && !original._retry && tokenStore.getRefreshToken()) {
        original._retry = true
        try {
          refreshPromise = refreshPromise ?? refreshAccessToken()
          const accessToken = await refreshPromise
          refreshPromise = null
          original.headers.Authorization = `Bearer ${accessToken}`
          return client(original)
        } catch {
          refreshPromise = null
          tokenStore.clear()
          emitSessionExpired()
        }
      }
      return Promise.reject(error)
    }
  )
}
