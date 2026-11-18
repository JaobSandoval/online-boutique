import type { Money } from '../api/types'

/** Precio a mostrar: el convertido a la moneda elegida, o USD si no hay. */
export function productPrice(p: { price?: Money; priceUsd: Money }): Money {
  return p.price ?? p.priceUsd
}

export function formatMoney(m: Money | undefined): string {
  return m ? `${m.currencyCode} ${m.amount}` : ''
}
