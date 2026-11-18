import type { Money } from '../api/types'

export function moneyValue(m: Money | undefined): number {
  return m ? Number.parseFloat(m.amount) || 0 : 0
}

export function formatMoney(value: number, currencyCode = 'USD'): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currencyCode }).format(value)
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`
  }
}

export function formatPrice(m: Money | undefined): string {
  return formatMoney(moneyValue(m), m?.currencyCode || 'USD')
}

/** Precio a mostrar: el convertido a la moneda elegida, o USD si no hay. */
export function productPrice(p: { price?: Money; priceUsd: Money }): Money {
  return p.price ?? p.priceUsd
}

export const CURRENCY_NAMES: Record<string, string> = {
  USD: 'Dólar estadounidense',
  EUR: 'Euro',
  CAD: 'Dólar canadiense',
  JPY: 'Yen japonés',
  GBP: 'Libra esterlina',
  TRY: 'Lira turca',
}

// El catálogo trae las categorías en inglés; las mostramos en español.
const CATEGORY_LABELS: Record<string, string> = {
  accessories: 'Accesorios',
  clothing: 'Ropa',
  tops: 'Blusas y playeras',
  footwear: 'Calzado',
  hair: 'Cabello',
  beauty: 'Belleza',
  decor: 'Decoración',
  home: 'Hogar',
  kitchen: 'Cocina',
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1)
}
