import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { assetUrl } from '../api/assetUrl'
import { getProduct, getRecommendations, addToCart } from '../api/storeClient'
import { ProductCard } from '../components/ProductCard'
import { useCart } from '../context/CartContext'
import type { Product } from '../api/types'

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const { refresh } = useCart()

  useEffect(() => {
    if (!id) return
    getProduct(id).then(setProduct)
    getRecommendations([id]).then(setRecommendations).catch(() => undefined)
  }, [id])

  if (!product) return <p className="status-message">Cargando producto…</p>

  async function handleAddToCart() {
    if (!product) return
    setAdding(true)
    try {
      await addToCart(product.id, quantity)
      await refresh()
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="product-detail">
      <img src={assetUrl(product.picture)} alt={product.name} />
      <div>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <p className="price">
          {product.priceUsd.currencyCode} {product.priceUsd.amount}
        </p>
        <div className="add-to-cart">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          />
          <button onClick={handleAddToCart} disabled={adding}>
            {adding ? 'Agregando…' : 'Agregar al carrito'}
          </button>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="recommendations">
          <h2>También te puede interesar</h2>
          <div className="product-grid">
            {recommendations.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
