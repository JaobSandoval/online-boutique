import { Link } from 'react-router-dom'
import { ChatIcon, ReturnIcon, TruckIcon } from '../components/Icons'

export function Welcome() {
  return (
    <div className="welcome">
      <section className="hero welcome-hero">
        <div className="hero-text">
          <span className="eyebrow">Online Boutique</span>
          <h1>Piezas únicas para tu día a día</h1>
          <p>
            Explora el catálogo, arma tu carrito y resuelve tus dudas al instante con nuestro asistente de compras con
            inteligencia artificial. Inicia sesión o crea una cuenta para empezar.
          </p>
          <div className="welcome-actions">
            <Link to="/register" className="btn-link light">
              Crear cuenta gratis
            </Link>
            <Link to="/login" className="btn-link outline-light">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      <ul className="welcome-highlights">
        <li>
          <TruckIcon size={28} />
          <strong>Catálogo completo</strong>
          <span>Ropa, accesorios, cocina y decoración con recomendaciones personalizadas.</span>
        </li>
        <li>
          <ChatIcon size={28} />
          <strong>Asistente 24/7</strong>
          <span>Pregunta por productos, tallas o tu pedido y te respondemos al momento.</span>
        </li>
        <li>
          <ReturnIcon size={28} />
          <strong>Compra sin riesgo</strong>
          <span>Devoluciones gratis durante 30 días y pago protegido.</span>
        </li>
      </ul>
    </div>
  )
}
