import { Link } from 'react-router-dom'
import { assetUrl } from '../api/assetUrl'
import type { Product } from '../api/types'

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <img src={assetUrl(product.picture)} alt={product.name} />
      <h3>{product.name}</h3>
      <p>
        {product.priceUsd.currencyCode} {product.priceUsd.amount}
      </p>
    </Link>
  )
}
