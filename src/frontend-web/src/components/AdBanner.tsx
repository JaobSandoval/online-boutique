import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAd } from '../api/storeClient'
import type { Ad } from '../api/types'

/**
 * Anuncio contextual de adservice, como el de la tienda Go original: en el
 * home sin contexto y en cada producto según sus categorías. Si adservice no
 * responde, simplemente no se muestra nada.
 */
export function AdBanner({ categories = [] }: { categories?: string[] }) {
  const [ad, setAd] = useState<Ad | null>(null)
  const key = categories.join(',')

  useEffect(() => {
    let cancelled = false
    getAd(key ? key.split(',') : [])
      .then((a) => !cancelled && setAd(a))
      .catch(() => !cancelled && setAd(null))
    return () => {
      cancelled = true
    }
  }, [key])

  if (!ad) return null
  const internal = ad.redirectUrl.startsWith('/')

  return (
    <aside className="ad-banner" aria-label="Anuncio">
      <span className="ad-label">Anuncio</span>
      {internal ? (
        <Link to={ad.redirectUrl}>{ad.text}</Link>
      ) : (
        <a href={ad.redirectUrl} target="_blank" rel="nofollow noopener noreferrer">
          {ad.text}
        </a>
      )}
    </aside>
  )
}
