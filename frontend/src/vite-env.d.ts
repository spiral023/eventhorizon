/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PACKAGE_VERSION: string;
  readonly VITE_USE_MOCKS: string;
  // Add other env vars here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}