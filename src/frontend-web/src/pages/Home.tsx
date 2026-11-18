import { useEffect, useState } from 'react'
import { listProducts } from '../api/storeClient'
import { AdBanner } from '../components/AdBanner'
import { ProductCard } from '../components/ProductCard'
import { useStore } from '../context/StoreContext'
import type { Product } from '../api/types'

export function Home() {
  const { currency } = useStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch(() => setError('No se pudieron cargar los productos.'))
      .finally(() => setLoading(false))
  }, [currency])

  if (loading) return <p className="status-message">Cargando productos…</p>
  if (error) return <p className="status-message status-error">{error}</p>

  return (
    <>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <AdBanner />
    </>
  )
}
