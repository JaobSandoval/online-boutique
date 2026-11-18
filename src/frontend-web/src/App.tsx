import { Route, Routes } from 'react-router-dom'
import { ChatWidget } from './components/ChatWidget'
import { GuestOnly, RequireAuth, RequireRole } from './components/RequireAuth'
import { Navbar } from './components/Navbar'
import { useAuth } from './context/AuthContext'
import { useStore } from './context/StoreContext'
import { Admin } from './pages/Admin'
import { Cart } from './pages/Cart'
import { Checkout } from './pages/Checkout'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { ProductDetail } from './pages/ProductDetail'
import { Register } from './pages/Register'
import { Welcome } from './pages/Welcome'

const SUPPORT_ROLES = ['admin', 'support_agent']

function RootRoute() {
  const { user, loading } = useAuth()
  if (loading) return <p className="status-message">Cargando…</p>
  return user ? <Home /> : <Welcome />
}

// Detalles del despliegue (cluster/zona/pod), como el footer de la tienda Go original.
function DeploymentFooter() {
  const { info } = useStore()
  const d = info?.deployment
  if (!d || !(d.clustername || d.zone || d.hostname)) return null
  return (
    <footer className="deployment-footer">
      {d.clustername && <span>Cluster: {d.clustername}</span>}
      {d.zone && <span>Zona: {d.zone}</span>}
      {d.hostname && <span>Pod: {d.hostname}</span>}
    </footer>
  )
}

function App() {
  const { user } = useAuth()

  return (
    <>
      <Navbar />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
          </Route>
          <Route element={<RequireRole roles={SUPPORT_ROLES} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </main>
      {user && <DeploymentFooter />}
      {user && <ChatWidget />}
    </>
  )
}

export default App
