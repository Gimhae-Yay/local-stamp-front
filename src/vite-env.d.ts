/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PORTONE_STORE_ID?: string;
  readonly VITE_PORTONE_CHANNEL_KEY?: string;
  readonly VITE_PORTONE_NOTICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
