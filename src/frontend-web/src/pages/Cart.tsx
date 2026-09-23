import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProduct } from '../api/storeClient'
import { useCart } from '../context/CartContext'
import type { Product } from '../api/types'

export function Cart() {
  const { items, clear } = useCart()
  const [products, setProducts] = useState<Record<string, Product>>({})

  useEffect(() => {
    Promise.all(items.map((item) => getProduct(item.productId))).then((fetched) => {
      const byId: Record<string, Product> = {}
      fetched.forEach((p) => (byId[p.id] = p))
      setProducts(byId)
    })
  }, [items])

  if (items.length === 0) {
    return <p className="status-message">Tu carrito está vacío.</p>
  }

  return (
    <div className="cart-page">
      <h1>Tu carrito</h1>
      <ul className="cart-list">
        {items.map((item) => {
          const product = products[item.productId]
          return (
            <li key={item.productId}>
              <span>{product?.name ?? item.productId}</span>
              <span>x{item.quantity}</span>
              {product && (
                <span>
                  {product.priceUsd.currencyCode} {product.priceUsd.amount}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <div className="cart-actions">
        <button onClick={clear}>Vaciar carrito</button>
        <Link to="/checkout">
          <button>Ir a pagar</button>
        </Link>
      </div>
    </div>
  )
}
