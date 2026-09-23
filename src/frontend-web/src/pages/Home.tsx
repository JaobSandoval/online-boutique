import { useEffect, useState } from 'react'
import { listProducts } from '../api/storeClient'
import { ProductCard } from '../components/ProductCard'
import type { Product } from '../api/types'

export function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch(() => setError('No se pudieron cargar los productos.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="status-message">Cargando productos…</p>
  if (error) return <p className="status-message status-error">{error}</p>

  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
