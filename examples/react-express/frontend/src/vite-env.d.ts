/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENKEY_HOST: string;
  readonly VITE_TINYCLOUD_HOST: string;
  readonly VITE_BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
