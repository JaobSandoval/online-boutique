import { useState } from 'react'
import { Link } from 'react-router-dom'
import { assetUrl } from '../api/assetUrl'
import { useCart } from '../context/CartContext'
import { categoryLabel, formatPrice, productPrice } from '../lib/format'
import type { Product } from '../api/types'
import { CartIcon } from './Icons'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const [adding, setAdding] = useState(false)

  async function quickAdd() {
    setAdding(true)
    try {
      await addItem(product.id, 1)
    } finally {
      setAdding(false)
    }
  }

  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`} className="product-card-media">
        <img src={assetUrl(product.picture)} alt={product.name} loading="lazy" />
        {product.categories[0] && <span className="product-card-tag">{categoryLabel(product.categories[0])}</span>}
      </Link>
      <div className="product-card-body">
        <Link to={`/product/${product.id}`} className="product-card-name">
          {product.name}
        </Link>
        <p className="product-card-desc">{product.description}</p>
        <div className="product-card-footer">
          <span className="product-card-price">{formatPrice(productPrice(product))}</span>
          <button className="btn-sm" onClick={quickAdd} disabled={adding} aria-label={`Agregar ${product.name} al carrito`}>
            <CartIcon size={16} />
            {adding ? 'Agregando…' : 'Agregar'}
          </button>
        </div>
      </div>
    </article>
  )
}
