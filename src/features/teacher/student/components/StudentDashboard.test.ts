import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import type { StudentListItem, StudentRepository } from '@/features/teacher/student'
import { useStudentStore } from '@/stores/students'
import StudentDashboard from './StudentDashboard.vue'

const student: StudentListItem = {
  studentId: 7,
  name: '김하늘',
  school: '새봄초등학교',
  age: 10,
  imageUrl: null,
  recentTraining: '문장 이해',
  recentLearningDate: '2026-07-18',
  weeklyScheduledCount: 3,
  weeklyCompletedCount: 1,
  weeklyParticipationRate: 33,
  totalLearningMinutes: 120,
}

function createRepository(): StudentRepository {
  return {
    list: vi.fn().mockResolvedValue({
      students: [student],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    }),
    getSummary: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getLearningSummary: vi.fn(),
    listLearningEvents: vi.fn(),
    getLearningEvent: vi.fn(),
    getAccuracyTrend: vi.fn(),
    getAccuracyRecords: vi.fn(),
    getReadingSpeedTrend: vi.fn(),
    getReadingSpeedRecords: vi.fn(),
    getTrainingHistory: vi.fn(),
    updateTeacherMemo: vi.fn(),
  }
}

async function mountDashboard() {
  const pinia = createPinia()
  useStudentStore(pinia).setRepository(createRepository())
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: StudentDashboard,
      },
      {
        path: '/teacher/students/new',
        name: 'student-create',
        component: { template: '<p>아동 등록</p>' },
      },
      {
        path: '/teacher/students/:id',
        name: 'student-overview',
        component: { template: '<p>학습 현황</p>' },
      },
      {
        path: '/teacher/students/:id/edit',
        name: 'student-edit',
        component: { template: '<p>정보 수정</p>' },
      },
    ],
  })
  await router.push('/teacher/students')
  await router.isReady()
  const wrapper = mount(StudentDashboard, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return { router, wrapper }
}

describe('StudentDashboard', () => {
  it('검색·필터 영역 안에 아동 등록 action을 표시한다', async () => {
    const { wrapper } = await mountDashboard()

    expect(wrapper.get('.filters .student-create-button').text()).toContain('아동 등록')
    expect(wrapper.find('.page-heading .student-create-button').exists()).toBe(false)
  })

  it('행을 선택하면 학습 현황으로 이동한다', async () => {
    const { router, wrapper } = await mountDashboard()

    await wrapper.get('.student-row').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('student-overview')
    expect(router.currentRoute.value.params.id).toBe('7')
  })

  it('정보 수정 버튼은 행 선택과 분리되어 정보 관리 화면으로 이동한다', async () => {
    const { router, wrapper } = await mountDashboard()

    await wrapper.get('[aria-label="김하늘 정보 수정"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('student-edit')
    expect(router.currentRoute.value.params.id).toBe('7')
  })
})
