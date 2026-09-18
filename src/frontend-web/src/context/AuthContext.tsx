import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchProfile, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/accountClient'
import { onSessionExpired } from '../api/authEvents'
import { tokenStore } from '../api/tokenStore'
import type { User } from '../api/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tokenStore.getAccessToken()) {
      setLoading(false)
      return
    }
    fetchProfile()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  // Fires when a background token refresh fails (refresh token expired or
  // revoked elsewhere) — without this, `user` would stay populated while
  // every API call silently 401s until the next full page reload.
  useEffect(() => onSessionExpired(() => setUser(null)), [])

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password)
    setUser(await fetchProfile())
  }, [])

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    await apiRegister(email, password, displayName)
    await apiLogin(email, password)
    setUser(await fetchProfile())
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
