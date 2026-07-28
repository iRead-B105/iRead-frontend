import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installAuthenticationGuard, resolveTeacherRedirect } from '.'
import type { TeacherProfile } from '@/features/teacher/auth'
import { useSessionStore } from '@/stores/session'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'teacher-login', component: { template: '<div />' } },
  { path: '/signup', name: 'teacher-signup', component: { template: '<div />' } },
  {
    path: '/reset-password',
    name: 'teacher-reset-password',
    component: { template: '<div />' },
  },
  {
    path: '/teacher',
    component: { template: '<router-view />' },
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'teacher-dashboard',
        component: { template: '<div />' },
      },
      {
        path: 'students',
        name: 'teacher-students',
        component: { template: '<div />' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: { template: '<div />' } },
]

const teacher: TeacherProfile = {
  email: 'teacher@example.com',
  name: '교수자',
  organization: null,
  gender: null,
  profileImageUrl: null,
}

function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  installAuthenticationGuard(router)
  return router
}

describe('authentication route guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('공개 인증 route에서는 세션 복원을 요청하지 않는다', async () => {
    const router = createTestRouter()
    const session = useSessionStore()
    session.restoreSession = vi.fn().mockResolvedValue(false)

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('teacher-login')
    expect(session.restoreSession).not.toHaveBeenCalled()
  })

  it('보호 route는 세션 복원 성공 후 접근한다', async () => {
    const router = createTestRouter()
    const session = useSessionStore()
    session.restoreSession = vi.fn().mockResolvedValue(true)

    await router.push('/teacher/students')

    expect(router.currentRoute.value.name).toBe('teacher-students')
    expect(session.restoreSession).toHaveBeenCalledOnce()
  })

  it('비인증 사용자를 redirect query와 함께 로그인으로 이동시킨다', async () => {
    const router = createTestRouter()
    const session = useSessionStore()
    session.restoreSession = vi.fn().mockResolvedValue(false)

    await router.push('/teacher/students')

    expect(router.currentRoute.value.name).toBe('teacher-login')
    expect(router.currentRoute.value.query.redirect).toBe('/teacher/students')
  })

  it('인증 사용자가 공개 인증 route에 접근하면 대시보드로 이동시킨다', async () => {
    const router = createTestRouter()
    const session = useSessionStore()
    session.initialize(teacher, 'access-token')

    await router.push('/signup')

    expect(router.currentRoute.value.name).toBe('teacher-dashboard')
  })

  it('/find-id route를 제공하지 않는다', () => {
    const router = createTestRouter()

    expect(router.resolve('/find-id').name).toBe('not-found')
  })
})

describe('resolveTeacherRedirect', () => {
  it('존재하는 내부 교수자 경로만 허용한다', () => {
    const router = createTestRouter()

    expect(resolveTeacherRedirect(router, '/teacher/students?tab=active')).toBe(
      '/teacher/students?tab=active',
    )
    expect(resolveTeacherRedirect(router, '/teacher/students#recent')).toBe(
      '/teacher/students#recent',
    )
  })

  it.each([
    'https://example.com',
    '//example.com',
    '///example.com',
    '/\\example.com',
    '/teacher/students/../../login',
    ['/teacher/students'],
    '/login',
    '/signup',
    '/reset-password',
    '/unknown',
    undefined,
  ])('외부·공개·존재하지 않는 redirect를 대시보드로 대체한다: %s', (redirect) => {
    const router = createTestRouter()

    expect(resolveTeacherRedirect(router, redirect)).toBe('/teacher/dashboard')
  })
})
