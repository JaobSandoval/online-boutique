import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getCurrencies, getStoreInfo, setStoreCurrency } from '../api/storeClient'
import { useAuth } from './AuthContext'
import type { StoreInfo } from '../api/types'

const CURRENCY_KEY = 'ob.currency'

interface StoreContextValue {
  currency: string
  currencies: string[]
  setCurrency: (code: string) => void
  info: StoreInfo | null
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined)

function readSavedCurrency(): string {
  try {
    return localStorage.getItem(CURRENCY_KEY) || 'USD'
  } catch {
    return 'USD'
  }
}

/**
 * Selector de moneda (currencyservice) y datos generales de la tienda
 * (mensaje del encabezado y detalles del despliegue), como en la tienda Go
 * original. La moneda se guarda por navegador, igual que la cookie original.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currency, setCurrencyState] = useState(() => {
    const saved = readSavedCurrency()
    // Se fija antes del primer render de los hijos para que su primera
    // petición ya pida los precios en la moneda guardada.
    setStoreCurrency(saved)
    return saved
  })
  const [currencies, setCurrencies] = useState<string[]>([])
  const [info, setInfo] = useState<StoreInfo | null>(null)

  useEffect(() => {
    if (!user) return
    getCurrencies()
      .then((list) => {
        setCurrencies(list)
        // Si la moneda guardada ya no está disponible, vuelve a USD.
        if (list.length && !list.includes(readSavedCurrency())) {
          setStoreCurrency('USD')
          setCurrencyState('USD')
        }
      })
      .catch(() => setCurrencies([]))
    getStoreInfo()
      .then(setInfo)
      .catch(() => setInfo(null))
  }, [user])

  const setCurrency = useCallback((code: string) => {
    setStoreCurrency(code)
    setCurrencyState(code)
    try {
      localStorage.setItem(CURRENCY_KEY, code)
    } catch {
      // sin almacenamiento disponible: la moneda dura solo esta sesión
    }
  }, [])

  return <StoreContext.Provider value={{ currency, currencies, setCurrency, info }}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
