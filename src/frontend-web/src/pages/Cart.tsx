import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCartQuote, getProduct } from '../api/storeClient'
import { useCart } from '../context/CartContext'
import { useStore } from '../context/StoreContext'
import { formatMoney } from '../lib/format'
import type { CartQuote, Product } from '../api/types'

export function Cart() {
  const { items, clear } = useCart()
  const { currency } = useStore()
  const [products, setProducts] = useState<Record<string, Product>>({})
  // Precios convertidos + costo de envío (shippingservice), como el
  // resumen del carrito de la tienda Go original.
  const [quote, setQuote] = useState<CartQuote | null>(null)

  useEffect(() => {
    Promise.all(items.map((item) => getProduct(item.productId))).then((fetched) => {
      const byId: Record<string, Product> = {}
      fetched.forEach((p) => (byId[p.id] = p))
      setProducts(byId)
    })
    if (items.length === 0) return
    getCartQuote()
      .then(setQuote)
      .catch(() => setQuote(null))
  }, [items, currency])

  if (items.length === 0) {
    return <p className="status-message">Tu carrito está vacío.</p>
  }

  return (
    <div className="cart-page">
      <h1>Tu carrito</h1>
      <ul className="cart-list">
        {items.map((item) => {
          const product = products[item.productId]
          const line = quote?.items.find((q) => q.productId === item.productId)
          return (
            <li key={item.productId}>
              <span>{product?.name ?? item.productId}</span>
              <span>x{item.quantity}</span>
              {line ? <span>{formatMoney(line.lineTotal)}</span> : product && <span>{formatMoney(product.price ?? product.priceUsd)}</span>}
            </li>
          )
        })}
      </ul>
      {quote && (
        <div className="cart-totals">
          <div>
            <span>Subtotal</span>
            <span>{formatMoney(quote.subtotal)}</span>
          </div>
          <div>
            <span>Envío</span>
            <span>{formatMoney(quote.shippingCost)}</span>
          </div>
          <div className="cart-total">
            <span>Total</span>
            <span>{formatMoney(quote.total)}</span>
          </div>
        </div>
      )}
      <div className="cart-actions">
        <button onClick={clear}>Vaciar carrito</button>
        <Link to="/checkout">
          <button>Ir a pagar</button>
        </Link>
      </div>
    </div>
  )
}
