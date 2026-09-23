const storeOrigin = import.meta.env.VITE_STORE_API_BASE_URL.replace(/\/api\/v1\/?$/, '')

export function assetUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${storeOrigin}${path}`
}
