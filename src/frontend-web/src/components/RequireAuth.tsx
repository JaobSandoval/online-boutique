import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <p className="status-message">Cargando…</p>
  // "/" doubles as the guest landing page (Welcome), so a deep link to a
  // protected route while logged out lands there instead of a bare form.
  if (!user) return <Navigate to="/" replace />
  return <Outlet />
}

export function GuestOnly() {
  const { user, loading } = useAuth()
  if (loading) return <p className="status-message">Cargando…</p>
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}
