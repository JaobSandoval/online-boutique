import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useStore } from '../context/StoreContext'
import { CURRENCY_NAMES } from '../lib/format'
import { CartIcon, SearchIcon, UserIcon } from './Icons'

export function Navbar() {
  const { user, logout } = useAuth()
  const { itemCount, openDrawer } = useCart()
  const { currency, currencies, setCurrency, info } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [bump, setBump] = useState(false)

  // Mantiene la caja de búsqueda sincronizada con la URL (p. ej. al limpiar filtros).
  useEffect(() => {
    if (location.pathname === '/') setQuery(params.get('q') ?? '')
  }, [location.pathname, params])

  // Pequeña animación del ícono cada vez que cambia la cantidad.
  useEffect(() => {
    if (itemCount === 0) return
    setBump(true)
    const t = setTimeout(() => setBump(false), 350)
    return () => clearTimeout(t)
  }, [itemCount])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
  }

  return (
    <header className="site-header">
      <div className="announcement">{info?.message || 'Envío a todo el país · Devoluciones sin costo por 30 días'}</div>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="brand-mark">OB</span>
          <span>Online Boutique</span>
        </Link>

        {user && (
          <form className="navbar-search" onSubmit={handleSearch} role="search">
            <SearchIcon size={18} />
            <input
              type="search"
              placeholder="Buscar productos…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar productos"
            />
          </form>
        )}

        <div className="navbar-links">
          {user ? (
            <>
              {(user.roles.includes('admin') || user.roles.includes('support_agent')) && (
                <Link to="/admin" className="nav-link">
                  Panel de soporte
                </Link>
              )}
              {currencies.length > 0 && (
                <select
                  className="currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  aria-label="Moneda"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c} title={CURRENCY_NAMES[c]}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <div className="navbar-user">
                <UserIcon size={18} />
                <span>{user.displayName}</span>
              </div>
              <button className="btn-ghost" onClick={handleLogout}>
                Salir
              </button>
              <button
                className={`cart-button ${bump ? 'bump' : ''}`}
                onClick={openDrawer}
                aria-label={`Abrir carrito, ${itemCount} artículos`}
              >
                <CartIcon size={24} />
                {itemCount > 0 && <span className="cart-badge">{itemCount > 99 ? '99+' : itemCount}</span>}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Iniciar sesión
              </Link>
              <Link to="/register" className="btn-link">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
