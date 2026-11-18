import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { addToCart as apiAddToCart, emptyCart as apiEmptyCart, getCart } from '../api/storeClient'
import { useAuth } from './AuthContext'
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
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])

  // Cart is now a logged-in-only feature (the API itself requires a valid
  // JWT), so there is no anonymous cart to fetch before login.
  const refresh = useCallback(async () => {
    if (!user) {
      setItems([])
      return
    }
    setItems(await getCart())
  }, [user])

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
