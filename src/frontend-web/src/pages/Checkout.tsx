import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkout } from '../api/storeClient'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function Checkout() {
  const { user } = useAuth()
  const { refresh } = useCart()
  const navigate = useNavigate()
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
        currency: 'USD',
      })
      setOrderId(result.orderId)
      await refresh()
    } catch {
      setError('No se pudo completar el pedido. Verifica los datos e intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (orderId) {
    return (
      <div className="status-message">
        <h1>¡Gracias por tu compra!</h1>
        <p>Tu número de orden es {orderId}.</p>
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
      {error && <p className="status-error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Procesando…' : 'Pagar'}
      </button>
    </form>
  )
}
