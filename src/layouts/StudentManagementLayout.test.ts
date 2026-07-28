import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudentManagementLayout from './StudentManagementLayout.vue'
import type { StudentDetail, StudentRepository } from '@/features/teacher/student'
import { ApiError } from '@/lib/api'
import { useStudentStore } from '@/stores/students'

const student: StudentDetail = {
  studentId: 7,
  name: '김하늘',
  birthday: '2016-03-12',
  gender: 'Girl',
  school: '새봄초등학교',
  guardian: '김보호',
  guardianContact: '010-0000-0000',
  guardianEmail: null,
  address: null,
  createdAt: '2026-07-01T00:00:00Z',
  imageUrl: null,
  teacherMemo: null,
}

function createRepository(getDetail: StudentRepository['getDetail']): StudentRepository {
  return {
    getDetail,
  } as StudentRepository
}

async function mountRoute(path: string, getDetail: StudentRepository['getDetail']) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useStudentStore(pinia).setRepository(createRepository(getDetail))

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/teacher/students/:id',
        component: StudentManagementLayout,
        children: [
          {
            path: '',
            name: 'student-overview',
            component: { template: '<p data-test="student-view">학습자 화면</p>' },
          },
        ],
      },
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<p data-test="student-list">학습자 목록</p>' },
      },
    ],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(
    { template: '<RouterView />' },
    {
      global: { plugins: [pinia, router] },
    },
  )
  await flushPromises()

  return { router, wrapper }
}

function apiError(status: number): ApiError {
  return new ApiError({
    status,
    code: status === 403 ? 'FORBIDDEN' : 'RESOURCE_NOT_FOUND',
    message: 'Backend message',
  })
}

describe('StudentManagementLayout', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('잘못된 studentId에서는 API를 호출하지 않고 목록 action을 제공한다', async () => {
    const getDetail = vi.fn<StudentRepository['getDetail']>()
    const { router, wrapper } = await mountRoute('/teacher/students/invalid', getDetail)

    expect(getDetail).not.toHaveBeenCalled()
    expect(wrapper.get('[data-kind="not-found"]').text()).toContain(
      '올바르지 않은 학습자 주소입니다.',
    )

    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('teacher-students')
  })

  it.each([
    [403, 'forbidden', '접근할 권한이 없습니다.'],
    [404, 'not-found', '학습자를 찾을 수 없습니다.'],
  ] as const)('%i를 정상 empty와 구분한 route 상태로 표시한다', async (status, kind, title) => {
    const getDetail = vi.fn<StudentRepository['getDetail']>().mockRejectedValue(apiError(status))
    const { wrapper } = await mountRoute('/teacher/students/7', getDetail)

    expect(getDetail).toHaveBeenCalledWith(7)
    expect(wrapper.get(`[data-kind="${kind}"]`).text()).toContain(title)
    expect(wrapper.find('[data-test="student-view"]').exists()).toBe(false)
  })

  it('일시 오류를 재시도한 뒤 성공하면 하위 화면을 표시한다', async () => {
    const getDetail = vi
      .fn<StudentRepository['getDetail']>()
      .mockRejectedValueOnce(
        new ApiError({
          status: 500,
          code: 'INTERNAL_ERROR',
          message: 'Backend message',
        }),
      )
      .mockResolvedValueOnce(student)
    const { wrapper } = await mountRoute('/teacher/students/7', getDetail)

    expect(wrapper.get('[data-kind="error"]').text()).not.toContain('Backend message')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(getDetail).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-test="student-view"]').text()).toBe('학습자 화면')
  })
})
