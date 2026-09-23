import { Link } from 'react-router-dom'

export function Welcome() {
  return (
    <div className="welcome">
      <h1>Bienvenido a Online Boutique</h1>
      <p>
        Explora el catálogo, arma tu carrito y resuelve tus dudas al instante con nuestro asistente de compras
        con inteligencia artificial. Inicia sesión o crea una cuenta para empezar.
      </p>
      <div className="welcome-actions">
        <Link to="/login">
          <button>Iniciar sesión</button>
        </Link>
        <Link to="/register">
          <button className="secondary">Crear cuenta</button>
        </Link>
      </div>
      <ul className="welcome-highlights">
        <li>🛍️ Catálogo completo con recomendaciones personalizadas</li>
        <li>💬 Asistente de soporte disponible 24/7</li>
        <li>📦 Sigue tu historial de conversaciones desde cualquier dispositivo</li>
      </ul>
    </div>
  )
}
