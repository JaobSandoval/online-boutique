import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { addToCart as apiAddToCart, emptyCart as apiEmptyCart, getCart } from '../api/storeClient'
import type { CartItem } from '../api/types'

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  refresh: () => Promise<void>
  addItem: (productId: string, quantity: number) => Promise<void>
  clear: () => Promise<void>
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const refresh = useCallback(async () => {
    setItems(await getCart())
  }, [])

  useEffect(() => {
    refresh().catch(() => undefined)
  }, [refresh])

  const addItem = useCallback(
    async (productId: string, quantity: number) => {
      await apiAddToCart(productId, quantity)
      await refresh()
    },
    [refresh]
  )

  const clear = useCallback(async () => {
    await apiEmptyCart()
    await refresh()
  }, [refresh])

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider value={{ items, itemCount, refresh, addItem, clear }}>{children}</CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
