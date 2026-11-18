import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assetUrl } from '../api/assetUrl'
import { getRecommendations } from '../api/storeClient'
import { ArrowLeftIcon, CartIcon, LockIcon, TrashIcon } from '../components/Icons'
import { ProductCard } from '../components/ProductCard'
import { QuantityStepper } from '../components/QuantityStepper'
import { useCart } from '../context/CartContext'
import { categoryLabel, formatMoney, formatPrice, productPrice } from '../lib/format'
import type { Product } from '../api/types'

export function Cart() {
  const { lines, itemCount, subtotal, shipping, total, currencyCode, setQuantity, removeItem, clear, busy } = useCart()
  const navigate = useNavigate()
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const idsKey = lines.map((l) => l.item.productId).join(',')

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : []
    getRecommendations(ids)
      .then((list) => setRecommendations(list.filter((p) => !ids.includes(p.id)).slice(0, 4)))
      .catch(() => setRecommendations([]))
  }, [idsKey, currencyCode])

  if (lines.length === 0) {
    return (
      <div className="empty-state large">
        <CartIcon size={56} />
        <h1>Tu carrito está vacío</h1>
        <p className="muted">Descubre nuestros productos y agrega tus favoritos.</p>
        <Link to="/" className="btn-link">
          Ir a la tienda
        </Link>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <div className="page-heading">
        <h1>Tu carrito</h1>
        <span className="muted">
          {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
        </span>
      </div>

      <div className="cart-layout">
        <div>
          <ul className="cart-lines">
            {lines.map(({ item, product, lineTotal }) => (
              <li key={item.productId} className="cart-line">
                <Link to={`/product/${item.productId}`} className="cart-thumb lg">
                  {product && <img src={assetUrl(product.picture)} alt={product.name} />}
                </Link>
                <div className="cart-line-info">
                  <Link to={`/product/${item.productId}`} className="cart-line-name">
                    {product?.name ?? item.productId}
                  </Link>
                  {product && (
                    <span className="muted small">
                      {product.categories.map(categoryLabel).join(' · ')} · {formatPrice(productPrice(product))} c/u
                    </span>
                  )}
                  <div className="cart-line-actions">
                    <QuantityStepper
                      size="sm"
                      value={item.quantity}
                      disabled={busy}
                      onChange={(q) => setQuantity(item.productId, q)}
                    />
                    <button className="btn-text danger" onClick={() => removeItem(item.productId)} disabled={busy}>
                      <TrashIcon size={16} /> Quitar
                    </button>
                  </div>
                </div>
                <strong className="cart-line-total">{formatMoney(lineTotal, currencyCode)}</strong>
              </li>
            ))}
          </ul>
          <div className="cart-footer-actions">
            <Link to="/" className="btn-text">
              <ArrowLeftIcon size={16} /> Seguir comprando
            </Link>
            <button className="btn-text danger" onClick={clear} disabled={busy}>
              Vaciar carrito
            </button>
          </div>
        </div>

        <aside className="order-summary">
          <h2>Resumen del pedido</h2>
          <div className="summary-row">
            <span>Subtotal ({itemCount})</span>
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
          <button className="btn-block btn-lg" onClick={() => navigate('/checkout')} disabled={busy}>
            <LockIcon size={18} /> Proceder al pago
          </button>
          <p className="muted small center">Pago 100% seguro · Devoluciones gratis 30 días</p>
        </aside>
      </div>

      {recommendations.length > 0 && (
        <section className="recommendations">
          <h2>Completa tu compra</h2>
          <div className="product-grid">
            {recommendations.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
