import axios from 'axios'
import { attachAuthInterceptors } from './authRefresh'
import { tokenStore } from './tokenStore'
import type { TokenPair, User } from './types'

const baseURL = import.meta.env.VITE_ACCOUNT_API_BASE_URL

export const accountClient = axios.create({ baseURL })
attachAuthInterceptors(accountClient)

export async function register(email: string, password: string, displayName: string): Promise<User> {
  const { data } = await accountClient.post('/auth/register', {
    email,
    password,
    display_name: displayName,
  })
  return {
    userId: data.user_id,
    email: data.email,
    displayName: data.display_name,
    roles: data.roles,
    isActive: data.is_active,
  }
}

export async function login(email: string, password: string): Promise<TokenPair> {
  const { data } = await accountClient.post('/auth/login', { email, password })
  const tokens: TokenPair = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
  }
  tokenStore.setTokens(tokens.accessToken, tokens.refreshToken)
  return tokens
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStore.getRefreshToken()
  tokenStore.clear()
  if (refreshToken) {
    await accountClient.post('/auth/logout', { refresh_token: refreshToken }).catch(() => undefined)
  }
}

export async function fetchProfile(): Promise<User> {
  const { data } = await accountClient.get('/users/me')
  return {
    userId: data.user_id,
    email: data.email,
    displayName: data.display_name,
    roles: data.roles,
    isActive: data.is_active,
  }
}
