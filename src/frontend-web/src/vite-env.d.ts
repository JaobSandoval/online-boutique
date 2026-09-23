/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STORE_API_BASE_URL: string
  readonly VITE_ACCOUNT_API_BASE_URL: string
  readonly VITE_SUPPORT_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
