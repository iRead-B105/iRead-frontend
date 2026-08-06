// TypeScript가 Vite 전용 기능(import.meta.env, 정적 파일 import 등)의 자료형을 이해하도록 합니다.
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHILD_APP_DOWNLOAD_URL?: string
  readonly VITE_EYE_TRACKER_DRIVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
