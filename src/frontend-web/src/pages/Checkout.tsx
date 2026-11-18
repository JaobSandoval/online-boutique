import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assetUrl } from '../api/assetUrl'
import { checkout } from '../api/storeClient'
import { CheckIcon, LockIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatMoney, formatPrice } from '../lib/format'
import type { OrderResult, Product } from '../api/types'

interface PlacedOrder extends OrderResult {
  email: string
  products: Record<string, Product>
}

// Tarjeta de prueba que acepta el paymentservice de la demo (no se cobra nada).
const DEMO_DATA: Record<string, string> = {
  streetAddress: '1600 Amphitheatre Parkway',
  city: 'Mountain View',
  state: 'CA',
  country: 'United States',
  zipCode: '94043',
  creditCardNumber: '4432801561520454',
  ccMonth: '1',
  ccYear: String(new Date().getFullYear() + 2),
  ccCvv: '672',
}

export function Checkout() {
  const { user } = useAuth()
  const { lines, itemCount, subtotal, shipping, total, currencyCode, products, refresh } = useCart()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const [order, setOrder] = useState<PlacedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function fillDemo() {
    const form = formRef.current
    if (!form) return
    Object.entries(DEMO_DATA).forEach(([name, value]) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | null
      if (el) el.value = value
    })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    const snapshot = { ...products }
    try {
      const result = await checkout({
        email: String(form.get('email')),
        streetAddress: String(form.get('streetAddress')),
        city: String(form.get('city')),
        state: String(form.get('state')),
        country: String(form.get('country')),
        zipCode: Number(form.get('zipCode')),
        creditCardNumber: String(form.get('creditCardNumber')).replace(/\D/g, ''),
        creditCardExpirationMonth: Number(form.get('ccMonth')),
        creditCardExpirationYear: Number(form.get('ccYear')),
        creditCardCvv: Number(form.get('ccCvv')),
        currency: currencyCode,
      })
      setOrder({ ...result, email: String(form.get('email')), products: snapshot })
      window.scrollTo({ top: 0 })
      await refresh()
    } catch (err: unknown) {
      // 422 = la validación del servidor rechazó algún campo (misma
      // validación que el checkout de la tienda original).
      const res = (err as { response?: { status?: number; data?: { error?: string } } }).response
      setError(
        res?.status === 422
          ? `Revisa los datos del formulario: ${res.data?.error ?? 'hay campos inválidos'}.`
          : 'No se pudo completar el pedido. Verifica los datos e intenta de nuevo.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (order) {
    return (
      <div className="order-confirmation">
        <div className="confirmation-icon">
          <CheckIcon size={36} />
        </div>
        <h1>¡Gracias por tu compra!</h1>
        <p className="muted">
          Te enviamos la confirmación a <strong>{order.email}</strong>.
        </p>
        <dl className="order-facts">
          <div>
            <dt>Número de confirmación</dt>
            <dd>{order.orderId}</dd>
          </div>
          <div>
            <dt>Número de rastreo</dt>
            <dd>{order.shippingTrackingId}</dd>
          </div>
        </dl>
        <ul className="summary-lines">
          {order.items.map((it) => {
            const product = order.products[it.productId]
            return (
              <li key={it.productId}>
                <span className="cart-thumb sm">{product && <img src={assetUrl(product.picture)} alt="" />}</span>
                <span className="grow">
                  {product?.name ?? it.productId} <span className="muted">× {it.quantity}</span>
                </span>
                <span>{formatPrice(it.lineTotal)}</span>
              </li>
            )
          })}
        </ul>
        <div className="summary-row">
          <span>Envío</span>
          <span>{formatPrice(order.shippingCost)}</span>
        </div>
        <div className="summary-row total">
          <span>Total pagado</span>
          <strong>{formatPrice(order.totalPaid)}</strong>
        </div>
        <button className="btn-lg" onClick={() => navigate('/')}>
          Seguir comprando
        </button>
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="empty-state large">
        <h1>No hay nada que pagar</h1>
        <p className="muted">Tu carrito está vacío.</p>
        <Link to="/" className="btn-link">
          Ir a la tienda
        </Link>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      <div className="page-heading">
        <h1>Finalizar compra</h1>
        <button type="button" className="btn-text" onClick={fillDemo}>
          Usar datos de prueba
        </button>
      </div>

      <div className="cart-layout">
        <form ref={formRef} className="checkout-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>
              <span className="step">1</span> Contacto
            </legend>
            <label>
              Email
              <input name="email" type="email" defaultValue={user?.email} required />
            </label>
          </fieldset>

          <fieldset>
            <legend>
              <span className="step">2</span> Dirección de envío
            </legend>
            <label>
              Calle y número
              <input name="streetAddress" autoComplete="street-address" required />
            </label>
            <div className="form-row">
              <label>
                Ciudad
                <input name="city" autoComplete="address-level2" required />
              </label>
              <label>
                Estado
                <input name="state" autoComplete="address-level1" required />
              </label>
            </div>
            <div className="form-row">
              <label>
                País
                <input name="country" autoComplete="country-name" required />
              </label>
              <label>
                Código postal
                <input name="zipCode" inputMode="numeric" pattern="[0-9]{4,10}" autoComplete="postal-code" required />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>
              <span className="step">3</span> Pago
            </legend>
            <label>
              Número de tarjeta
              <input
                name="creditCardNumber"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                required
              />
            </label>
            <div className="form-row three">
              <label>
                Mes
                <input name="ccMonth" type="number" min={1} max={12} placeholder="MM" required />
              </label>
              <label>
                Año
                <input name="ccYear" type="number" min={new Date().getFullYear()} placeholder="AAAA" required />
              </label>
              <label>
                CVV
                <input name="ccCvv" inputMode="numeric" pattern="[0-9]{3,4}" placeholder="123" required />
              </label>
            </div>
          </fieldset>

          {error && <p className="status-error">{error}</p>}
          <button type="submit" className="btn-block btn-lg" disabled={submitting}>
            <LockIcon size={18} />
            {submitting ? 'Procesando…' : `Pagar ${formatMoney(total, currencyCode)}`}
          </button>
          <p className="muted small center">Esta es una tienda de demostración: no se realizará ningún cargo real.</p>
        </form>

        <aside className="order-summary">
          <h2>Tu pedido ({itemCount})</h2>
          <ul className="summary-lines">
            {lines.map(({ item, product, lineTotal }) => (
              <li key={item.productId}>
                <span className="cart-thumb sm">
                  {product && <img src={assetUrl(product.picture)} alt="" />}
                  <span className="thumb-qty">{item.quantity}</span>
                </span>
                <span className="grow">{product?.name ?? item.productId}</span>
                <span>{formatMoney(lineTotal, currencyCode)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal, currencyCode)}</span>
          </div>
          <div className="summary-row">
            <span>Envío</span>
            <span>{shipping === null ? <span className="muted">Calculando…</span> : formatMoney(shipping, currencyCode)}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <strong>{formatMoney(total, currencyCode)}</strong>
          </div>
          <Link to="/cart" className="btn-text">
            Editar carrito
          </Link>
        </aside>
      </div>
    </div>
  )
}
