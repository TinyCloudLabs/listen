/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENKEY_HOST: string;
  readonly VITE_OPENKEY_CLIENT_ID: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_ENABLE_TINYCLOUD_HOOKS?: string;
  readonly VITE_ENABLE_AGENT?: string;
  readonly VITE_ENABLE_CHAT?: string;
  readonly VITE_AGENT_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
