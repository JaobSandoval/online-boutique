import { Link } from 'react-router-dom'
import { assetUrl } from '../api/assetUrl'
import type { Product } from '../api/types'
import { formatMoney, productPrice } from '../lib/format'

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <img src={assetUrl(product.picture)} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{formatMoney(productPrice(product))}</p>
    </Link>
  )
}
