import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { assetUrl } from '../api/assetUrl'
import { getProduct, getRecommendations } from '../api/storeClient'
import { AdBanner } from '../components/AdBanner'
import { CartIcon, ReturnIcon, ShieldIcon, TruckIcon } from '../components/Icons'
import { ProductCard } from '../components/ProductCard'
import { QuantityStepper } from '../components/QuantityStepper'
import { useCart } from '../context/CartContext'
import { useStore } from '../context/StoreContext'
import { categoryLabel, formatMoney, formatPrice, moneyValue, productPrice } from '../lib/format'
import type { Product } from '../api/types'

type Tab = 'details' | 'shipping' | 'care'

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState<Tab>('details')
  const { addItem, items } = useCart()
  const { currency } = useStore()

  useEffect(() => {
    if (!id) return
    setProduct(null)
    setNotFound(false)
    setQuantity(1)
    window.scrollTo({ top: 0 })
    getProduct(id)
      .then(setProduct)
      .catch(() => setNotFound(true))
    getRecommendations([id])
      .then((list) => setRecommendations(list.filter((p) => p.id !== id).slice(0, 4)))
      .catch(() => setRecommendations([]))
  }, [id, currency])

  if (notFound)
    return (
      <div className="empty-state">
        <p>No encontramos este producto.</p>
        <Link to="/" className="btn-link">
          Volver a la tienda
        </Link>
      </div>
    )
  if (!product) return <p className="status-message">Cargando producto…</p>

  const inCart = items.find((it) => it.productId === product.id)?.quantity ?? 0
  const price = productPrice(product)
  const unit = moneyValue(price)

  async function handleAddToCart() {
    if (!product) return
    setAdding(true)
    try {
      await addItem(product.id, quantity)
      setQuantity(1)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="product-page">
      <nav className="breadcrumbs" aria-label="Ruta">
        <Link to="/">Tienda</Link>
        {product.categories[0] && (
          <>
            <span>/</span>
            <Link to={`/?cat=${product.categories[0]}`}>{categoryLabel(product.categories[0])}</Link>
          </>
        )}
        <span>/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="product-detail">
        <div className="product-gallery">
          <img src={assetUrl(product.picture)} alt={product.name} />
        </div>

        <div className="product-info">
          <div className="tag-list">
            {product.categories.map((c) => (
              <Link key={c} to={`/?cat=${c}`} className="tag">
                {categoryLabel(c)}
              </Link>
            ))}
          </div>
          <h1>{product.name}</h1>
          <p className="product-price">{formatPrice(price)}</p>
          <p className="product-description">{product.description}</p>

          <div className="stock-line">
            <span className="dot" /> Disponible · listo para enviar
          </div>

          <div className="buy-box">
            <QuantityStepper value={quantity} onChange={setQuantity} disabled={adding} />
            <button className="btn-lg" onClick={handleAddToCart} disabled={adding}>
              <CartIcon size={18} />
              {adding ? 'Agregando…' : `Agregar · ${formatMoney(unit * quantity, price.currencyCode)}`}
            </button>
          </div>
          {inCart > 0 && (
            <p className="muted small">
              Ya tienes {inCart} {inCart === 1 ? 'unidad' : 'unidades'} en tu carrito.
            </p>
          )}

          <ul className="perks">
            <li>
              <TruckIcon size={20} /> Envío a todo el país, costo calculado al pagar
            </li>
            <li>
              <ReturnIcon size={20} /> Devoluciones gratis durante 30 días
            </li>
            <li>
              <ShieldIcon size={20} /> Pago seguro y protegido
            </li>
          </ul>

          <div className="tabs">
            <div className="tab-list" role="tablist">
              <button role="tab" aria-selected={tab === 'details'} onClick={() => setTab('details')}>
                Detalles
              </button>
              <button role="tab" aria-selected={tab === 'shipping'} onClick={() => setTab('shipping')}>
                Envío y devoluciones
              </button>
              <button role="tab" aria-selected={tab === 'care'} onClick={() => setTab('care')}>
                Garantía
              </button>
            </div>
            <div className="tab-panel" role="tabpanel">
              {tab === 'details' && (
                <dl className="spec-list">
                  <div>
                    <dt>SKU</dt>
                    <dd>{product.id}</dd>
                  </div>
                  <div>
                    <dt>Categoría</dt>
                    <dd>{product.categories.map(categoryLabel).join(', ')}</dd>
                  </div>
                  <div>
                    <dt>Precio unitario</dt>
                    <dd>{formatPrice(price)}</dd>
                  </div>
                  <div>
                    <dt>Descripción</dt>
                    <dd>{product.description}</dd>
                  </div>
                </dl>
              )}
              {tab === 'shipping' && (
                <p>
                  Enviamos a todo el país. El costo exacto se calcula en el checkout según tu dirección y el contenido del
                  carrito. Si el producto no te convence, puedes devolverlo sin costo dentro de los 30 días siguientes a la
                  entrega.
                </p>
              )}
              {tab === 'care' && (
                <p>
                  Todos nuestros productos cuentan con garantía contra defectos de fabricación. Si tienes algún problema,
                  escríbele a nuestro asistente de soporte (botón de ayuda abajo a la derecha) y abriremos un ticket.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AdBanner categories={product.categories} />

      {recommendations.length > 0 && (
        <section className="recommendations">
          <h2>También te puede interesar</h2>
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
