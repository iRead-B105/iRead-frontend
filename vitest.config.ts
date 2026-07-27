import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    clearMocks: true,
    environment: 'jsdom',
    env: {
      VITE_AUTH_SOURCE: 'mock',
      VITE_DATA_SOURCE: 'mock',
    },
    setupFiles: ['./src/test/setup.ts'],
  },
})
