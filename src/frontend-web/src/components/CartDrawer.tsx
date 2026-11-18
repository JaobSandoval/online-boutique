import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assetUrl } from '../api/assetUrl'
import { useCart } from '../context/CartContext'
import { formatMoney, formatPrice, productPrice } from '../lib/format'
import { CartIcon, CheckIcon, CloseIcon, TrashIcon } from './Icons'
import { QuantityStepper } from './QuantityStepper'

export function CartDrawer() {
  const {
    drawerOpen,
    closeDrawer,
    lines,
    itemCount,
    subtotal,
    shipping,
    total,
    currencyCode,
    setQuantity,
    removeItem,
    busy,
    lastAddedId,
  } = useCart()
  const navigate = useNavigate()
  const added = lastAddedId ? lines.find((l) => l.item.productId === lastAddedId)?.product : undefined

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDrawer()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [drawerOpen, closeDrawer])

  function go(path: string) {
    closeDrawer()
    navigate(path)
  }

  return (
    <>
      <div className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`} onClick={closeDrawer} />
      <aside className={`cart-drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen} aria-label="Carrito">
        <header className="cart-drawer-header">
          <h2>
            Tu carrito <span className="muted">({itemCount})</span>
          </h2>
          <button className="icon-button" onClick={closeDrawer} aria-label="Cerrar carrito">
            <CloseIcon />
          </button>
        </header>

        {added && (
          <div className="cart-drawer-added">
            <CheckIcon size={18} />
            <span>
              <strong>{added.name}</strong> se agregó a tu carrito
            </span>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="cart-drawer-empty">
            <CartIcon size={48} />
            <p>Tu carrito está vacío.</p>
            <button onClick={() => go('/')}>Explorar productos</button>
          </div>
        ) : (
          <>
            <ul className="cart-drawer-list">
              {lines.map(({ item, product, lineTotal }) => (
                <li key={item.productId} className={item.productId === lastAddedId ? 'highlight' : ''}>
                  <Link to={`/product/${item.productId}`} onClick={closeDrawer} className="cart-thumb">
                    {product && <img src={assetUrl(product.picture)} alt={product.name} />}
                  </Link>
                  <div className="cart-drawer-info">
                    <Link to={`/product/${item.productId}`} onClick={closeDrawer} className="cart-drawer-name">
                      {product?.name ?? item.productId}
                    </Link>
                    <span className="muted small">{product ? formatPrice(productPrice(product)) : ''} c/u</span>
                    <div className="cart-drawer-row">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        disabled={busy}
                        onChange={(q) => setQuantity(item.productId, q)}
                      />
                      <button
                        className="icon-button danger"
                        onClick={() => removeItem(item.productId)}
                        disabled={busy}
                        aria-label={`Quitar ${product?.name ?? 'producto'}`}
                      >
                        <TrashIcon size={18} />
                      </button>
                    </div>
                  </div>
                  <strong className="cart-drawer-total">{formatMoney(lineTotal, currencyCode)}</strong>
                </li>
              ))}
            </ul>
            <footer className="cart-drawer-footer">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, currencyCode)}</span>
              </div>
              <div className="summary-row">
                <span>Envío estimado</span>
                <span>{shipping === null ? <span className="muted">Calculando…</span> : formatMoney(shipping, currencyCode)}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <strong>{formatMoney(total, currencyCode)}</strong>
              </div>
              <button className="btn-block" onClick={() => go('/checkout')} disabled={busy}>
                Pagar ahora
              </button>
              <button className="btn-block btn-secondary" onClick={() => go('/cart')}>
                Ver carrito completo
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  )
}
