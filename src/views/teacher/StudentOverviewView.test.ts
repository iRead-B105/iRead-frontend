import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import StudentOverviewView from './StudentOverviewView.vue'
import type {
  StudentDetail,
  StudentLearningSummary,
  StudentRepository,
} from '@/features/teacher/student'
import { ApiError } from '@/lib/api'
import { useStudentStore } from '@/stores/students'

function detail(studentId: number, name = '김하늘'): StudentDetail {
  return {
    studentId,
    name,
    birthday: '2018-03-15',
    gender: 'Boy',
    school: '새봄초등학교',
    guardian: '김보호',
    guardianContact: '010-0000-0001',
    guardianEmail: null,
    address: null,
    createdAt: '2026-03-01T09:00:00+09:00',
    imageUrl: null,
    teacherMemo: '기존 메모',
  }
}

function learningSummary(
  studentId: number,
  overrides: Partial<StudentLearningSummary> = {},
): StudentLearningSummary {
  return {
    studentId,
    currentStage: '문장 이해력 향상',
    lastLearningAt: '2026-07-27T16:00:00+09:00',
    attentionRequiredCount: 1,
    attentionReasons: ['LOW_ACCURACY'],
    ...overrides,
  }
}

function repository(
  overrides: Partial<StudentRepository> = {},
): StudentRepository {
  return {
    list: vi.fn().mockResolvedValue({
      students: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    }),
    getSummary: vi.fn().mockResolvedValue({
      totalStudents: 0,
      scheduledTodayCount: 0,
    }),
    getDetail: vi.fn().mockImplementation((studentId) => Promise.resolve(detail(studentId))),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getLearningSummary: vi.fn().mockImplementation((studentId) =>
      Promise.resolve(learningSummary(studentId)),
    ),
    updateTeacherMemo: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

async function mountOverview(
  studentRepository: StudentRepository,
  initialPath = '/teacher/students/1',
) {
  const pinia = createPinia()
  const studentStore = useStudentStore(pinia)
  studentStore.setRepository(studentRepository)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<div>아동 목록</div>' },
      },
      {
        path: '/teacher/students/:id',
        name: 'student-overview',
        component: StudentOverviewView,
      },
      {
        path: '/teacher/students/:id/edit',
        name: 'student-edit',
        component: { template: '<div>아동 수정</div>' },
      },
    ],
  })
  await router.push(initialPath)
  await router.isReady()
  const wrapper = mount(StudentOverviewView, {
    global: {
      plugins: [pinia, router],
    },
  })
  await flushPromises()
  return { wrapper, router, studentStore }
}

describe('StudentOverviewView', () => {
  it('상세와 Backend 공식 학습 summary만 표시한다', async () => {
    const { wrapper } = await mountOverview(repository())

    expect(wrapper.text()).toContain('김하늘 학습 현황')
    expect(wrapper.text()).toContain('문장 이해력 향상')
    expect(wrapper.text()).toContain('최근 읽기 정확도 확인 필요')
    expect(wrapper.text()).toContain('교수자 확인 신호')
    expect(wrapper.text()).not.toContain('확인 완료')
    expect(wrapper.text()).not.toContain('다음 권장 훈련')
    expect(wrapper.text()).not.toContain('목표 80%')
  })

  it('NO_HISTORY를 주의 건수와 분리해 표시한다', async () => {
    const studentRepository = repository({
      getLearningSummary: vi.fn().mockResolvedValue(
        learningSummary(3, {
          currentStage: null,
          lastLearningAt: null,
          attentionRequiredCount: 0,
          attentionReasons: ['NO_HISTORY'],
        }),
      ),
    })
    const { wrapper } = await mountOverview(studentRepository, '/teacher/students/3')

    expect(wrapper.text()).toContain('교수자 확인 신호')
    expect(wrapper.text()).toContain('0건')
    expect(wrapper.text()).toContain('아직 학습 기록이 없습니다.')
    expect(wrapper.text()).not.toContain('최근 읽기 정확도 확인 필요')
  })

  it('route의 studentId가 바뀌면 새 상세를 조회하고 이전 아동을 표시하지 않는다', async () => {
    const getDetail = vi.fn().mockImplementation((studentId: number) =>
      Promise.resolve(detail(studentId, studentId === 1 ? '첫째 아동' : '둘째 아동')),
    )
    const studentRepository = repository({
      getDetail,
      getLearningSummary: vi.fn().mockImplementation((studentId: number) =>
        Promise.resolve(learningSummary(studentId)),
      ),
    })
    const { wrapper, router } = await mountOverview(studentRepository)

    await router.push('/teacher/students/2')
    await flushPromises()

    expect(getDetail).toHaveBeenCalledWith(2)
    expect(wrapper.text()).toContain('둘째 아동 학습 현황')
    expect(wrapper.text()).not.toContain('첫째 아동 학습 현황')
  })

  it('403 접근 오류를 mock 학습자로 대체하지 않는다', async () => {
    const studentRepository = repository({
      getDetail: vi.fn().mockRejectedValue(
        new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: '접근 권한이 없습니다.',
        }),
      ),
    })
    const { wrapper } = await mountOverview(studentRepository)

    expect(wrapper.text()).toContain('이 아동을 조회할 권한이 없습니다.')
    expect(wrapper.text()).toContain('아동 목록으로 이동')
    expect(wrapper.text()).not.toContain('김하늘')
  })

  it('404에서는 목록 이동 action을 제공하고 고정 상세를 표시하지 않는다', async () => {
    const studentRepository = repository({
      getDetail: vi.fn().mockRejectedValue(
        new ApiError({
          status: 404,
          code: 'STUDENT_NOT_FOUND',
          message: '아동을 찾을 수 없습니다.',
        }),
      ),
    })
    const { wrapper } = await mountOverview(studentRepository)

    expect(wrapper.text()).toContain('아동을 찾을 수 없습니다.')
    expect(wrapper.text()).toContain('아동 목록으로 이동')
    expect(wrapper.text()).not.toContain('김하늘')
  })

  it('메모를 trim해 저장하고 빈 값으로 기존 메모를 삭제한다', async () => {
    const updateTeacherMemo = vi.fn().mockResolvedValue(undefined)
    const { wrapper } = await mountOverview(repository({ updateTeacherMemo }))
    const textarea = wrapper.get<HTMLTextAreaElement>('#internal-note')

    await textarea.setValue('  새 메모  ')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '메모 저장')
      ?.trigger('click')
    await flushPromises()

    expect(updateTeacherMemo).toHaveBeenNthCalledWith(1, 1, '새 메모')
    expect(textarea.element.value).toBe('새 메모')

    await textarea.setValue('   ')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '메모 삭제')
      ?.trigger('click')
    await flushPromises()

    expect(updateTeacherMemo).toHaveBeenNthCalledWith(2, 1, null)
    expect(textarea.element.value).toBe('')
  })

  it('메모 저장 실패 시 입력을 유지하고 중복 요청을 막는다', async () => {
    let rejectSave!: (error: Error) => void
    const savePromise = new Promise<void>((_resolve, reject) => {
      rejectSave = reject
    })
    const updateTeacherMemo = vi.fn().mockReturnValue(savePromise)
    const { wrapper } = await mountOverview(repository({ updateTeacherMemo }))
    const textarea = wrapper.get<HTMLTextAreaElement>('#internal-note')
    await textarea.setValue('저장 실패 메모')
    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text() === '메모 저장')!

    await saveButton.trigger('click')
    await saveButton.trigger('click')

    expect(updateTeacherMemo).toHaveBeenCalledTimes(1)
    expect(saveButton.attributes('disabled')).toBeDefined()
    rejectSave(new Error('저장 실패'))
    await flushPromises()

    expect(textarea.element.value).toBe('저장 실패 메모')
    expect(wrapper.text()).toContain('저장 실패')
  })
})
