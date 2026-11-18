import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addToCart as apiAddToCart, emptyCart as apiEmptyCart, getCart, getCartQuote, listProducts } from '../api/storeClient'
import { moneyValue, productPrice } from '../lib/format'
import { useAuth } from './AuthContext'
import { useStore } from './StoreContext'
import type { CartItem, CartQuote, Product } from '../api/types'

export interface CartLine {
  item: CartItem
  product: Product | undefined
  lineTotal: number
}

interface CartContextValue {
  items: CartItem[]
  lines: CartLine[]
  itemCount: number
  subtotal: number
  /** Envío cotizado por shippingservice; null mientras se calcula. */
  shipping: number | null
  total: number
  currencyCode: string
  products: Record<string, Product>
  busy: boolean
  drawerOpen: boolean
  lastAddedId: string | null
  openDrawer: () => void
  closeDrawer: () => void
  refresh: () => Promise<void>
  addItem: (productId: string, quantity: number) => Promise<void>
  setQuantity: (productId: string, quantity: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  clear: () => Promise<void>
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { currency } = useStore()
  const [items, setItems] = useState<CartItem[]>([])
  const [quote, setQuote] = useState<CartQuote | null>(null)
  const [products, setProducts] = useState<Record<string, Product>>({})
  const [busy, setBusy] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  // Serializa las mutaciones: cartservice solo expone "agregar" y "vaciar",
  // así que cambiar cantidades = vaciar + volver a agregar. Si dos cambios se
  // cruzaran, el carrito podría quedar con datos de ambos.
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  // Cart is a logged-in-only feature (the API itself requires a valid JWT),
  // so there is no anonymous cart to fetch before login.
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

  // El catálogo es pequeño: se carga una vez y sirve para mostrar imagen,
  // nombre y precio de cada línea del carrito sin una petición por producto.
  useEffect(() => {
    if (!user) return
    listProducts()
      .then((list) => setProducts(Object.fromEntries(list.map((p) => [p.id, p]))))
      .catch(() => undefined)
  }, [user, currency])

  // Subtotal, envío y total calculados por el backend (currencyservice +
  // shippingservice), como el resumen del carrito de la tienda original.
  const itemsKey = items.map((it) => `${it.productId}:${it.quantity}`).join(',')
  useEffect(() => {
    if (!user || !itemsKey) {
      setQuote(null)
      return
    }
    let cancelled = false
    getCartQuote()
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setQuote(null))
    return () => {
      cancelled = true
    }
  }, [user, itemsKey, currency])

  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task, task)
    queue.current = run.catch(() => undefined)
    return run
  }, [])

  const withBusy = useCallback(
    async (task: () => Promise<void>) => {
      setBusy(true)
      try {
        await enqueue(task)
      } finally {
        setBusy(false)
      }
    },
    [enqueue]
  )

  const addItem = useCallback(
    async (productId: string, quantity: number) => {
      await withBusy(async () => {
        await apiAddToCart(productId, quantity)
        await refresh()
      })
      setLastAddedId(productId)
      setDrawerOpen(true)
    },
    [refresh, withBusy]
  )

  const replaceCart = useCallback(
    async (next: CartItem[]) => {
      setItems(next) // optimista: la UI responde al instante
      await withBusy(async () => {
        try {
          await apiEmptyCart()
          for (const it of next) {
            if (it.quantity > 0) await apiAddToCart(it.productId, it.quantity)
          }
        } finally {
          await refresh()
        }
      })
    },
    [refresh, withBusy]
  )

  const setQuantity = useCallback(
    (productId: string, quantity: number) =>
      replaceCart(
        items
          .map((it) => (it.productId === productId ? { ...it, quantity: Math.max(0, quantity) } : it))
          .filter((it) => it.quantity > 0)
      ),
    [items, replaceCart]
  )

  const removeItem = useCallback(
    (productId: string) => replaceCart(items.filter((it) => it.productId !== productId)),
    [items, replaceCart]
  )

  const clear = useCallback(async () => {
    setItems([])
    await withBusy(async () => {
      await apiEmptyCart()
      await refresh()
    })
  }, [refresh, withBusy])

  const value = useMemo<CartContextValue>(() => {
    // La cotización solo vale si corresponde exactamente al carrito actual.
    const quoteFresh =
      quote !== null &&
      quote.currency === currency &&
      quote.items.map((it) => `${it.productId}:${it.quantity}`).join(',') ===
        items.map((it) => `${it.productId}:${it.quantity}`).join(',')
    const lines = items.map((item) => {
      const product = products[item.productId]
      const quoted = quoteFresh ? quote.items.find((q) => q.productId === item.productId) : undefined
      const lineTotal = quoted
        ? moneyValue(quoted.lineTotal)
        : (product ? moneyValue(productPrice(product)) : 0) * item.quantity
      return { item, product, lineTotal }
    })
    const subtotal = quoteFresh ? moneyValue(quote.subtotal) : lines.reduce((sum, l) => sum + l.lineTotal, 0)
    const shipping = quoteFresh ? moneyValue(quote.shippingCost) : null
    return {
      items,
      lines,
      itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
      subtotal,
      shipping,
      total: subtotal + (shipping ?? 0),
      currencyCode: currency,
      products,
      busy,
      drawerOpen,
      lastAddedId,
      openDrawer: () => {
        setLastAddedId(null)
        setDrawerOpen(true)
      },
      closeDrawer: () => setDrawerOpen(false),
      refresh,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }
  }, [items, products, quote, currency, busy, drawerOpen, lastAddedId, refresh, addItem, setQuantity, removeItem, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
