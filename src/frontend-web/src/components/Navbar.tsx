import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function Navbar() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Online Boutique
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/cart">Carrito ({itemCount})</Link>
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
  )
}
