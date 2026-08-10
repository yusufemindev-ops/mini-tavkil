/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_AUTH_URL: string;
  readonly VITE_STOREFRONT_BASE_URL: string;
  readonly VITE_ADMIN_BASE_URL: string;
  readonly VITE_API_MOCKING: string;
  readonly VITE_MOCK_DELAY_MS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
