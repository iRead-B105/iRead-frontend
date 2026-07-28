import { createPinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import TeacherSidebar from './TeacherSidebar.vue'
import { MockReportRepository } from '@/features/teacher/report'
import type {
  StudentListItem,
  StudentRepository,
} from '@/features/teacher/student'
import { useSessionStore } from '@/stores/session'
import { useReportStore } from '@/stores/report'
import { installSessionScopedStoreReset } from '@/stores/sessionScopedStores'
import { useStudentStore } from '@/stores/students'

const defaultStudents: readonly StudentListItem[] = [
  {
    studentId: 7,
    name: '김하늘',
    school: '새봄초등학교',
    age: 10,
    imageUrl: null,
    recentTraining: '문장 이해',
    recentLearningDate: '2026-07-18',
    weeklyScheduledCount: 3,
    weeklyCompletedCount: 2,
    weeklyParticipationRate: 67,
    totalLearningMinutes: 120,
  },
]

function createRepository(
  students: readonly StudentListItem[] = defaultStudents,
): StudentRepository {
  return {
    list: vi.fn().mockResolvedValue({
      students,
      page: 0,
      size: 10,
      totalElements: students.length,
      totalPages: students.length ? 1 : 0,
    }),
    getSummary: vi.fn().mockResolvedValue({
      totalStudents: students.length,
      scheduledTodayCount: 0,
    }),
    getDetail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getLearningSummary: vi.fn(),
    listLearningEvents: vi.fn(),
    getLearningEvent: vi.fn(),
    getAccuracyTrend: vi.fn(),
    getTrainingHistory: vi.fn(),
    updateTeacherMemo: vi.fn(),
  }
}

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'teacher-login', component: { template: '<div />' } },
      { path: '/teacher/dashboard', name: 'teacher-dashboard', component: { template: '<div />' } },
      { path: '/teacher/students', name: 'teacher-students', component: { template: '<div />' } },
      { path: '/teacher/settings', name: 'teacher-settings', component: { template: '<div />' } },
      { path: '/teacher/students/:id', name: 'student-overview', component: { template: '<div />' } },
      { path: '/teacher/students/:id/curriculum', name: 'student-curriculum', component: { template: '<div />' } },
      { path: '/teacher/students/:id/training-history', name: 'student-training-history', component: { template: '<div />' } },
      { path: '/teacher/students/:id/test-history', name: 'student-test-history', component: { template: '<div />' } },
      { path: '/teacher/students/:id/report', name: 'student-report', component: { template: '<div />' } },
      { path: '/teacher/students/:id/edit', name: 'student-edit', component: { template: '<div />' } },
    ],
  })
}

async function mountSidebar(
  repository: StudentRepository,
  initialPath = '/teacher/dashboard',
): Promise<{
  wrapper: VueWrapper
  router: Router
  pinia: ReturnType<typeof createPinia>
}> {
  const pinia = createPinia()
  const router = createTestRouter()
  installSessionScopedStoreReset(pinia)
  const session = useSessionStore(pinia)
  session.initialize({
    email: 'teacher@example.com',
    name: '이선생',
    organization: 'iRead 학습센터',
    gender: 'FEMALE',
    profileImageUrl: '/images/teacher-a.png',
  })
  useStudentStore(pinia).setRepository(repository)

  await router.push(initialPath)
  await router.isReady()
  const wrapper = mount(TeacherSidebar, {
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  })
  await flushPromises()

  return { wrapper, router, pinia }
}

async function selectAccountMenuItem(wrapper: VueWrapper, label: string): Promise<void> {
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
  it('session의 실제 교수자 profile만 표시하고 변경을 반영한다', async () => {
    const { wrapper, pinia } = await mountSidebar(createRepository())
    const session = useSessionStore(pinia)

    expect(wrapper.text()).toContain('이선생')
    expect(wrapper.text()).toContain('iRead 학습센터')

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
  })

  it('목록 Repository의 studentId로 하위 route를 만든다', async () => {
    const { wrapper } = await mountSidebar(createRepository(), '/teacher/students')

    expect(wrapper.html()).toContain('/teacher/students/7')
    expect(wrapper.html()).not.toContain('/teacher/students/0')
  })

  it('목록이 비어 있으면 임시 하위 route를 만들지 않는다', async () => {
    const { wrapper } = await mountSidebar(createRepository([]))

    expect(wrapper.text()).toContain('등록된 아동이 없습니다')
    expect(wrapper.text()).not.toContain('학습 현황')
    expect(wrapper.html()).not.toContain('/teacher/students/0')
  })

  it('로그아웃 성공 시 Student·Report 상태를 초기화하고 로그인 화면으로 이동한다', async () => {
    const { wrapper, router, pinia } = await mountSidebar(createRepository())
    const session = useSessionStore(pinia)
    const students = useStudentStore(pinia)
    const reports = useReportStore(pinia)
    reports.setRepository(new MockReportRepository({ delayMs: 0 }))
    await reports.loadForStudent(1)
    expect(reports.reports.length).toBeGreaterThan(0)

    await selectAccountMenuItem(wrapper, '로그아웃')

    expect(session.authenticated).toBe(false)
    expect(students.navigationItems).toEqual([])
    expect(reports.activeStudentId).toBeNull()
    expect(reports.reports).toEqual([])
    expect(router.currentRoute.value.name).toBe('teacher-login')
  })

  it('로그아웃 실패 시 세션과 현재 route를 유지한다', async () => {
    const { wrapper, router, pinia } = await mountSidebar(createRepository())
    const session = useSessionStore(pinia)
    vi.spyOn(session, 'logout').mockRejectedValueOnce(new Error('network error'))

    await selectAccountMenuItem(wrapper, '로그아웃')

    expect(session.authenticated).toBe(true)
    expect(router.currentRoute.value.name).toBe('teacher-dashboard')
    expect(wrapper.get('[role="alert"]').text()).toContain('로그아웃에 실패했습니다')
  })
})
