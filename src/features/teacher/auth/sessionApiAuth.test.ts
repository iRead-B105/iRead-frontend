import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { useSessionStore } from '@/stores/session'
import { createSessionApiAuthHooks } from './sessionApiAuth'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/login',
        name: 'teacher-login',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/dashboard',
        name: 'teacher-dashboard',
        component: { template: '<div />' },
        meta: { requiresAuth: true },
      },
    ],
  })
}

describe('session API auth hooks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('refresh 성공 여부를 API client에 반환한다', async () => {
    const router = createTestRouter()
    const session = useSessionStore()
    session.handleUnauthorized = vi.fn().mockResolvedValue(true)
    const hooks = createSessionApiAuthHooks(session, router)

    await expect(
      hooks.onUnauthorized?.(
        new ApiError({
          status: 401,
          code: 'TOKEN_EXPIRED',
          message: '만료됨',
        }),
        { requestRetried: false },
      ),
    ).resolves.toBe(true)

    expect(session.handleUnauthorized).toHaveBeenCalledWith(false)
  })

  it('refresh 실패 시 현재 보호 경로를 보존하고 로그인으로 이동한다', async () => {
    const router = createTestRouter()
    await router.push('/teacher/dashboard?tab=recent')
    const session = useSessionStore()
    session.handleUnauthorized = vi.fn().mockResolvedValue(false)
    const hooks = createSessionApiAuthHooks(session, router)

    await hooks.onUnauthorized?.(
      new ApiError({
        status: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'refresh 실패',
      }),
      { requestRetried: false },
    )

    expect(router.currentRoute.value.name).toBe('teacher-login')
    expect(router.currentRoute.value.query.redirect).toBe('/teacher/dashboard?tab=recent')
  })

  it('동시 401 복구 실패에서는 로그인 이동을 한 번만 수행한다', async () => {
    const router = createTestRouter()
    await router.push('/teacher/dashboard?tab=recent')
    const session = useSessionStore()
    session.handleUnauthorized = vi.fn().mockResolvedValue(false)
    const replace = vi.spyOn(router, 'replace')
    const hooks = createSessionApiAuthHooks(session, router)
    const error = new ApiError({
      status: 401,
      code: 'INVALID_REFRESH_TOKEN',
      message: 'refresh 실패',
    })

    await Promise.all([
      hooks.onUnauthorized?.(error, { requestRetried: false }),
      hooks.onUnauthorized?.(error, { requestRetried: false }),
    ])

    expect(replace).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.query.redirect).toBe('/teacher/dashboard?tab=recent')
  })
})
