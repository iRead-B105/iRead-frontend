// TypeScript가 Vite 전용 기능(import.meta.env, 정적 파일 import 등)의 자료형을 이해하도록 합니다.
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: 'mock' | 'api'
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BACKEND_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
