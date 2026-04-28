/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENKEY_HOST: string;
  readonly VITE_OPENKEY_CLIENT_ID: string;
  readonly VITE_TINYCLOUD_HOST: string;
  readonly VITE_TINYCLOUD_LOCATION_REGISTRY_URL?: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_ENABLE_TINYCLOUD_HOOKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
