import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  StudentListItem,
  StudentListResult,
  StudentRepository,
} from '@/features/teacher/student'
import { useStudentStore } from './students'

const firstStudent: StudentListItem = {
  studentId: 1,
  name: '첫 학습자',
  school: '새봄초등학교',
  age: 8,
  imageUrl: null,
  recentTraining: null,
  recentLearningDate: null,
  weeklyScheduledCount: 0,
  weeklyCompletedCount: 0,
  weeklyParticipationRate: null,
  totalLearningMinutes: 0,
}

function result(
  students: readonly StudentListItem[],
  page = 0,
  totalElements = students.length,
  totalPages = students.length ? 1 : 0,
): StudentListResult {
  return {
    students,
    page,
    size: 10,
    totalElements,
    totalPages,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

const mutationRepositoryMethods = {
  getDetail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('Student store', () => {
  it('목록과 summary 실패 상태를 서로 독립적으로 관리한다', async () => {
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValue(result([firstStudent])),
      getSummary: vi.fn().mockRejectedValue(new Error('summary failed')),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    await Promise.all([store.loadList(), store.loadSummary()])

    expect(store.listStatus).toBe('success')
    expect(store.students).toEqual([firstStudent])
    expect(store.summaryStatus).toBe('error')
    expect(store.students).toEqual([firstStudent])
  })

  it('느린 이전 목록 응답이 최신 검색 결과를 덮지 못한다', async () => {
    const first = deferred<StudentListResult>()
    const second = deferred<StudentListResult>()
    const newerStudent = { ...firstStudent, studentId: 2, name: '최신 학습자' }
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise),
      getSummary: vi.fn().mockResolvedValue({ totalStudents: 2, scheduledTodayCount: 0 }),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    const oldRequest = store.loadList()
    store.setListFilters({ keyword: '최신' })
    const newRequest = store.loadList()
    second.resolve(result([newerStudent]))
    await newRequest
    first.resolve(result([firstStudent]))
    await oldRequest

    expect(store.students).toEqual([newerStudent])
    expect(store.query.keyword).toBe('최신')
  })

  it('관리 목록과 Sidebar query·page 상태를 분리한다', async () => {
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockImplementation((query = {}) =>
        Promise.resolve(
          result(
            [{ ...firstStudent, studentId: (query.page ?? 0) + 1 }],
            query.page ?? 0,
            20,
            2,
          ),
        ),
      ),
      getSummary: vi.fn().mockResolvedValue({ totalStudents: 20, scheduledTodayCount: 0 }),
    }
    const store = useStudentStore()
    store.setRepository(repository)
    store.setListFilters({ keyword: '관리' })
    store.setListPage(1)

    await store.searchNavigation('선택기')
    const selectedBeforeNextPage = store.selectedStudentId
    await store.loadMoreNavigation()

    expect(store.query).toMatchObject({ keyword: '관리', page: 1 })
    expect(store.navigationQuery).toMatchObject({ keyword: '선택기', page: 1 })
    expect(store.navigationItems.map((student) => student.studentId)).toEqual([1, 2])
    expect(store.selectedStudentId).toBe(selectedBeforeNextPage)
  })

  it('Sidebar 검색 결과가 바뀌어도 선택한 학습자를 보존한다', async () => {
    const secondStudent = { ...firstStudent, studentId: 2, name: '둘째 학습자' }
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn()
        .mockResolvedValueOnce(result([firstStudent, secondStudent]))
        .mockResolvedValueOnce(result([secondStudent])),
      getSummary: vi.fn().mockResolvedValue({ totalStudents: 2, scheduledTodayCount: 0 }),
    }
    const store = useStudentStore()
    store.setRepository(repository)
    await store.loadNavigation({ reset: true })
    store.rememberStudent(firstStudent)

    await store.searchNavigation('둘째')

    expect(store.selectedStudentId).toBe(firstStudent.studentId)
    expect(store.navigationItemsById[firstStudent.studentId]?.name).toBe(firstStudent.name)
    expect(store.navigationItems.map((student) => student.studentId)).toEqual([2])
  })

  it('logout용 reset은 Student 상태만 비운다', async () => {
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValue(result([firstStudent])),
      getSummary: vi.fn().mockResolvedValue({ totalStudents: 1, scheduledTodayCount: 1 }),
    }
    const store = useStudentStore()
    store.setRepository(repository)
    await Promise.all([store.loadList(), store.loadNavigation({ reset: true })])

    store.reset()

    expect(store.students).toEqual([])
    expect(store.navigationItems).toEqual([])
    expect(store.listStatus).toBe('idle')
  })
})
