import { createPinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import TeacherSidebar from './TeacherSidebar.vue'
import {
  provideTeacherAdmin,
  type TeacherAdminState,
} from '@/features/teacher/useTeacherAdmin'
import type { TeacherAdminRepository } from '@/features/teacher/repositories'
import { useSessionStore } from '@/stores/session'

function createRepository(
  students: Awaited<ReturnType<TeacherAdminRepository['listStudents']>> = [
    {
      id: 7,
      name: '김하늘',
      age: 10,
      recentLearningDate: '2026-07-18',
      totalLearningTime: 120,
      recentTraining: '문장 이해',
    },
  ],
): TeacherAdminRepository {
  return {
    getTeacherInfo: vi.fn().mockResolvedValue({
      email: 'teacher@example.com',
      name: '이선생',
      organization: 'iRead 학습센터',
      gender: 'FEMALE',
      profileImageUrl: '/images/teacher-a.png',
    }),
    listStudents: vi.fn().mockResolvedValue(students),
    logout: vi.fn().mockResolvedValue(undefined),
  }
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'teacher-login', component: { template: '<div />' } },
      {
        path: '/teacher/dashboard',
        name: 'teacher-dashboard',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/settings',
        name: 'teacher-settings',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/students/:id',
        name: 'student-overview',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/students/:id/curriculum',
        name: 'student-curriculum',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/students/:id/training-history',
        name: 'student-training-history',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/students/:id/test-history',
        name: 'student-test-history',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/students/:id/report',
        name: 'student-report',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/students/:id/edit',
        name: 'student-edit',
        component: { template: '<div />' },
      },
    ],
  })
}

async function mountSidebar(
  repository: TeacherAdminRepository,
  initialPath = '/teacher/dashboard',
): Promise<{
  wrapper: VueWrapper
  router: Router
  pinia: ReturnType<typeof createPinia>
  state: TeacherAdminState
}> {
  const pinia = createPinia()
  const router = createTestRouter()
  let state!: TeacherAdminState
  const Host = defineComponent({
    setup() {
      state = provideTeacherAdmin(repository)
      return () => h(TeacherSidebar)
    },
  })

  await router.push(initialPath)
  await router.isReady()
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
    },
  })
  await flushPromises()

  return { wrapper, router, pinia, state }
}

async function selectAccountMenuItem(wrapper: VueWrapper, label: string) {
  await wrapper.get('[aria-label="계정 메뉴 열기"]').trigger('click')
  await nextTick()

  const item = Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]'),
  ).find((element) => element.textContent?.trim() === label)

  expect(item).toBeDefined()
  item?.click()
  await flushPromises()
}

describe('TeacherSidebar', () => {
  it('공통 TeacherProfile을 표시하고 상태 교체를 즉시 반영한다', async () => {
    const { wrapper, pinia } = await mountSidebar(createRepository())
    const session = useSessionStore(pinia)

    expect(wrapper.text()).toContain('이선생')
    expect(wrapper.text()).toContain('iRead 학습센터')
    expect(wrapper.get<HTMLImageElement>('img[alt="이선생 프로필"]').attributes('src')).toBe(
      '/images/teacher-a.png',
    )

    session.initialize({
      email: 'teacher@example.com',
      name: '박선생',
      organization: '새 학습센터',
      gender: 'MALE',
      profileImageUrl: '/images/teacher-b.png',
    })
    await nextTick()

    expect(wrapper.text()).toContain('박선생')
    expect(wrapper.text()).toContain('새 학습센터')
    expect(wrapper.get<HTMLImageElement>('img[alt="박선생 프로필"]').attributes('src')).toBe(
      '/images/teacher-b.png',
    )
  })

  it('실제 route로 이동하고 현재 최상위 메뉴를 표시한다', async () => {
    const { wrapper } = await mountSidebar(createRepository(), '/teacher/students')
    const links = wrapper.findAll('a')

    expect(links.some((link) => link.attributes('href') === '/teacher/dashboard')).toBe(true)
    expect(links.some((link) => link.attributes('href') === '/teacher/students')).toBe(true)
    expect(links.some((link) => link.attributes('href') === '/teacher/settings')).toBe(true)
    expect(
      links.find((link) => link.text().includes('아동 목록'))?.classes(),
    ).toContain('router-link-exact-active')
    expect(wrapper.html()).toContain('/teacher/students/7')
    expect(wrapper.html()).not.toContain('/teacher/students/0')
  })

  it('선택할 아동이 없으면 임시 식별자의 하위 링크를 만들지 않는다', async () => {
    const { wrapper } = await mountSidebar(createRepository([]))

    expect(wrapper.text()).toContain('등록된 아동이 없습니다')
    expect(wrapper.html()).not.toContain('/teacher/students/0')
    expect(wrapper.text()).not.toContain('학습 현황')
  })

  it('로그아웃 성공 후 로그인 화면으로 이동한다', async () => {
    const { wrapper, router, pinia } = await mountSidebar(createRepository())
    const session = useSessionStore(pinia)

    await selectAccountMenuItem(wrapper, '로그아웃')

    expect(session.authenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('teacher-login')
  })

  it('로그아웃 요청이 진행 중임을 표시한다', async () => {
    const { wrapper, pinia } = await mountSidebar(createRepository())
    const session = useSessionStore(pinia)
    let completeLogout!: () => void
    vi.spyOn(session, 'logout').mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        completeLogout = () => resolve(true)
      }),
    )

    await selectAccountMenuItem(wrapper, '로그아웃')

    expect(wrapper.get('[role="status"]').text()).toBe('로그아웃 중...')

    completeLogout()
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('로그아웃 실패 시 세션을 유지하고 재시도 오류를 표시한다', async () => {
    const { wrapper, router, pinia } = await mountSidebar(createRepository())
    const session = useSessionStore(pinia)
    vi.spyOn(session, 'logout').mockRejectedValueOnce(new Error('network error'))

    await selectAccountMenuItem(wrapper, '로그아웃')

    expect(session.authenticated).toBe(true)
    expect(session.teacher?.email).toBe('teacher@example.com')
    expect(router.currentRoute.value.name).toBe('teacher-dashboard')
    expect(wrapper.get('[role="alert"]').text()).toContain('로그아웃에 실패했습니다')
  })
})
