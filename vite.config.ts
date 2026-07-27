// URL 형태의 위치를 운영체제에서 사용할 수 있는 실제 파일 경로로 바꾸는 Node.js 도구입니다.
import { fileURLToPath, URL } from 'node:url'

// Vite는 개발 서버와 빌드를, Vue 플러그인은 .vue 파일 변환을 담당합니다.
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { resolveEnvironment } from './src/config/env'

// defineConfig로 감싸면 설정 항목의 자동 완성과 자료형 검사를 받을 수 있습니다.
export default defineConfig(({ command, mode }) => {
  const projectRoot = fileURLToPath(new URL('.', import.meta.url))
  const rawEnvironment = loadEnv(mode, projectRoot, 'VITE_')
  const environment = resolveEnvironment(rawEnvironment, {
    isProduction: command === 'build',
    requireBackendOrigin: command === 'serve' && mode !== 'test',
  })

  const proxyTarget = environment.backendUrl
  const proxy: Record<string, ProxyOptions> | undefined = proxyTarget
    ? {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
      }
    : undefined

  return {
    // Vue 파일 처리 기능과 개발 중 상태 확인용 Vue 개발 도구를 활성화합니다.
    plugins: [vue(), vueDevTools(), tailwindcss()],
    resolve: {
      alias: {
        // '@/components/...'를 'src/components/...'의 짧은 표기로 사용할 수 있게 합니다.
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy,
    },
  }
})
