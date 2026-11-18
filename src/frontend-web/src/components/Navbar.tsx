import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useStore } from '../context/StoreContext'

export function Navbar() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const { currency, currencies, setCurrency, info } = useStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <>
      {info?.message && <div className="store-message">{info.message}</div>}
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          Online Boutique
        </Link>
        <div className="navbar-links">
          {user ? (
            <>
              {currencies.length > 0 && (
                <select className="currency-select" value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Moneda">
                  {currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <Link to="/cart">Carrito ({itemCount})</Link>
              {(user.roles.includes('admin') || user.roles.includes('support_agent')) && (
                <Link to="/admin">Panel de soporte</Link>
              )}
              <span className="navbar-user">Hola, {user.displayName}</span>
              <button onClick={handleLogout}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link to="/login">Iniciar sesión</Link>
              <Link to="/register">Crear cuenta</Link>
            </>
          )}
        </div>
      </nav>
    </>
  )
}
