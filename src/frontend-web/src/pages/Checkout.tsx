import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkout, getCartQuote } from '../api/storeClient'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useStore } from '../context/StoreContext'
import { formatMoney } from '../lib/format'
import type { CartQuote, OrderResult } from '../api/types'

export function Checkout() {
  const { user } = useAuth()
  const { items, refresh } = useCart()
  const { currency } = useStore()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderResult | null>(null)
  const [quote, setQuote] = useState<CartQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (items.length === 0) return
    getCartQuote()
      .then(setQuote)
      .catch(() => setQuote(null))
  }, [items, currency])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      const result = await checkout({
        email: String(form.get('email')),
        streetAddress: String(form.get('streetAddress')),
        city: String(form.get('city')),
        state: String(form.get('state')),
        country: String(form.get('country')),
        zipCode: Number(form.get('zipCode')),
        creditCardNumber: String(form.get('creditCardNumber')),
        creditCardExpirationMonth: Number(form.get('ccMonth')),
        creditCardExpirationYear: Number(form.get('ccYear')),
        creditCardCvv: Number(form.get('ccCvv')),
        currency,
      })
      setOrder(result)
      await refresh()
    } catch (err: unknown) {
      // 422 = la validación del servidor rechazó algún campo (misma
      // validación que el checkout de la tienda Go original).
      const res = (err as { response?: { status?: number; data?: { error?: string } } }).response
      setError(
        res?.status === 422
          ? `Revisa los datos: ${res.data?.error ?? 'hay campos inválidos'}`
          : 'No se pudo completar el pedido. Verifica los datos e intenta de nuevo.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (order) {
    return (
      <div className="status-message">
        <h1>¡Gracias por tu compra!</h1>
        <p>Te enviamos un correo de confirmación.</p>
        <dl className="order-facts">
          <div>
            <dt>Número de orden</dt>
            <dd>{order.orderId}</dd>
          </div>
          <div>
            <dt>Número de rastreo</dt>
            <dd>{order.shippingTrackingId}</dd>
          </div>
          <div>
            <dt>Envío</dt>
            <dd>{formatMoney(order.shippingCost)}</dd>
          </div>
          <div>
            <dt>Total pagado</dt>
            <dd>{formatMoney(order.totalPaid)}</dd>
          </div>
        </dl>
        <button onClick={() => navigate('/')}>Volver a la tienda</button>
      </div>
    )
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <h1>Finalizar compra</h1>
      <input name="email" type="email" placeholder="Email" defaultValue={user?.email} required />
      <input name="streetAddress" placeholder="Dirección" required />
      <div className="form-row">
        <input name="city" placeholder="Ciudad" required />
        <input name="state" placeholder="Estado" required />
      </div>
      <div className="form-row">
        <input name="country" placeholder="País" required />
        <input name="zipCode" type="number" placeholder="Código postal" required />
      </div>
      <input name="creditCardNumber" placeholder="Número de tarjeta" required />
      <div className="form-row">
        <input name="ccMonth" type="number" placeholder="Mes" min={1} max={12} required />
        <input name="ccYear" type="number" placeholder="Año" required />
        <input name="ccCvv" type="number" placeholder="CVV" required />
      </div>
      {quote && (
        <p className="checkout-total">
          Total a pagar (envío incluido): <strong>{formatMoney(quote.total)}</strong>
        </p>
      )}
      {error && <p className="status-error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Procesando…' : 'Pagar'}
      </button>
    </form>
  )
}
