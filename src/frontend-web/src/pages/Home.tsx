import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { assetUrl } from '../api/assetUrl'
import { listProducts } from '../api/storeClient'
import { AdBanner } from '../components/AdBanner'
import { ProductCard } from '../components/ProductCard'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { categoryLabel, moneyValue } from '../lib/format'
import type { Product } from '../api/types'

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'name'

const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Destacados',
  'price-asc': 'Precio: menor a mayor',
  'price-desc': 'Precio: mayor a menor',
  name: 'Nombre (A–Z)',
}

export function Home() {
  const { user } = useAuth()
  const { currency } = useStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()

  const query = params.get('q')?.trim().toLowerCase() ?? ''
  const category = params.get('cat') ?? ''
  const sort = (params.get('sort') as SortKey) || 'featured'

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch(() => setError('No se pudieron cargar los productos.'))
      .finally(() => setLoading(false))
  }, [currency])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    products.forEach((p) => p.categories.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => categoryLabel(a[0]).localeCompare(categoryLabel(b[0])))
  }, [products])

  const visible = useMemo(() => {
    let list = products.filter(
      (p) =>
        (!category || p.categories.includes(category)) &&
        (!query ||
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.categories.some((c) => c.includes(query) || categoryLabel(c).toLowerCase().includes(query)))
    )
    if (sort === 'price-asc') list = [...list].sort((a, b) => moneyValue(a.priceUsd) - moneyValue(b.priceUsd))
    if (sort === 'price-desc') list = [...list].sort((a, b) => moneyValue(b.priceUsd) - moneyValue(a.priceUsd))
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, category, query, sort])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  if (loading) return <ProductGridSkeleton />
  if (error) return <p className="status-message status-error">{error}</p>

  const firstName = user?.displayName.split(' ')[0]

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Nueva temporada</span>
          <h1>{firstName ? `Hola ${firstName}, encuentra algo especial` : 'Encuentra algo especial'}</h1>
          <p>Accesorios, ropa y piezas para tu hogar seleccionadas con cuidado. Pregúntale a nuestro asistente si necesitas ideas.</p>
          <a href="#catalogo" className="btn-link light">
            Ver catálogo
          </a>
        </div>
        <div className="hero-collage" aria-hidden="true">
          {products.slice(0, 3).map((p) => (
            <img key={p.id} src={assetUrl(p.picture)} alt="" />
          ))}
        </div>
      </section>

      <section id="catalogo" className="catalog">
        <div className="catalog-toolbar">
          <div className="chips" role="tablist" aria-label="Categorías">
            <button className={`chip ${!category ? 'active' : ''}`} onClick={() => updateParam('cat', '')}>
              Todo <span>{products.length}</span>
            </button>
            {categories.map(([c, n]) => (
              <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => updateParam('cat', c)}>
                {categoryLabel(c)} <span>{n}</span>
              </button>
            ))}
          </div>
          <label className="sort-select">
            <span>Ordenar por</span>
            <select value={sort} onChange={(e) => updateParam('sort', e.target.value === 'featured' ? '' : e.target.value)}>
              {Object.entries(SORT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="muted catalog-count">
          {visible.length} {visible.length === 1 ? 'producto' : 'productos'}
          {query && (
            <>
              {' '}
              para “{params.get('q')}”
            </>
          )}
        </p>

        {visible.length === 0 ? (
          <div className="empty-state">
            <p>No encontramos productos con esos filtros.</p>
            <button className="btn-secondary" onClick={() => setParams({}, { replace: true })}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <AdBanner />
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="product-grid" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="product-card skeleton">
          <div className="skeleton-media" />
          <div className="product-card-body">
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  )
}
