import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MockTestRepository,
  type TestDetail,
  type TestListItem,
  type TestRepository,
} from '@/features/teacher/test'
import { ApiError } from '@/lib/api'
import { useTestStore } from './test'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

function repository(overrides: Partial<TestRepository> = {}): TestRepository {
  return {
    getTests: vi.fn().mockResolvedValue([]),
    getTest: vi.fn(),
    compareTests: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('Test store', () => {
  it('최신 완료 검사 커리큘럼을 기본 선택하고 단일 상세를 요청한다', async () => {
    const mock = new MockTestRepository()
    const compareTests = vi.spyOn(mock, 'compareTests')
    const store = useTestStore()
    store.setRepository(mock)

    await store.loadForStudent(1)

    expect(store.tests.map((test) => test.testCurriculumId)).toEqual([
      1_011, 1_008, 1_005, 1_004,
    ])
    expect(store.currentTestCurriculumId).toBe(1_011)
    expect(store.comparisonTestCurriculumIds).toEqual([])
    expect(store.comparisonResult?.currentTest.questions).toHaveLength(9)
    expect(compareTests).toHaveBeenCalledWith(
      1,
      1_011,
      [],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('비교 검사를 최대 두 건만 추가하고 개별 해제한다', async () => {
    const store = useTestStore()
    store.setRepository(new MockTestRepository())
    await store.loadForStudent(1)

    await expect(store.addComparisonTest(1, 1_008)).resolves.toBe(true)
    await expect(store.addComparisonTest(1, 1_005)).resolves.toBe(true)
    await expect(store.addComparisonTest(1, 1_004)).resolves.toBe(false)
    expect(store.comparisonTestCurriculumIds).toEqual([1_008, 1_005])

    await expect(store.removeComparisonTest(1, 1_008)).resolves.toBe(true)
    expect(store.comparisonTestCurriculumIds).toEqual([1_005])
    expect(
      store.comparisonResult?.comparisonTests.map((test) => test.testCurriculumId),
    ).toEqual([1_005])
  })

  it('검사 목록 재조회 실패 시 이전 결과를 유지한다', async () => {
    const mock = new MockTestRepository()
    const getTests = vi
      .fn()
      .mockResolvedValueOnce(await mock.getTests(1))
      .mockRejectedValueOnce(
        new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'internal details' }),
      )
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests,
        getTest: vi.fn().mockImplementation((studentId, id, options) =>
          mock.getTest(studentId, id, options),
        ),
        compareTests: vi.fn().mockImplementation((studentId, id, ids, options) =>
          mock.compareTests(studentId, id, ids, options),
        ),
      }),
    )
    await store.loadForStudent(1)
    const previousIds = store.tests.map((test) => test.testCurriculumId)

    await store.retryList()

    expect(store.listStatus).toBe('error')
    expect(store.tests.map((test) => test.testCurriculumId)).toEqual(previousIds)
    expect(store.listError).not.toContain('internal')
  })

  it('전체 검사 상세 일부가 실패해도 성공 결과만 평균에 유지한다', async () => {
    const mock = new MockTestRepository({ failedDetailTestCurriculumIds: [1_005] })
    const store = useTestStore()
    store.setRepository(mock)

    await store.loadForStudent(1)

    expect(store.trendStatus).toBe('success')
    expect(store.trendFailedCount).toBe(1)
    expect(store.trendDetails.map((detail) => detail.testCurriculumId)).toEqual([
      1_004, 1_008, 1_011,
    ])
    expect(store.trendError).toContain('일부 검사 상세 1건')
  })

  it('빠른 기준 변경에서 늦게 끝난 이전 상세 응답을 무시한다', async () => {
    const oldDetail = deferred<TestDetail>()
    const mock = new MockTestRepository()
    const compareTests = vi.fn().mockImplementation(async (studentId, id, ids, options) => {
      if (id === 1_008) {
        return { currentTest: await oldDetail.promise, comparisonTests: [] }
      }
      return mock.compareTests(studentId, id, ids, options)
    })
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockResolvedValue(await mock.getTests(1)),
        getTest: vi.fn().mockImplementation((studentId, id, options) =>
          mock.getTest(studentId, id, options),
        ),
        compareTests,
      }),
    )
    await store.loadForStudent(1)

    const oldRequest = store.selectCurrentTest(1, 1_008)
    await store.selectCurrentTest(1, 1_005)
    oldDetail.resolve(await mock.getTest(1, 1_008))
    await oldRequest

    expect(store.currentTestCurriculumId).toBe(1_005)
    expect(store.comparisonResult?.currentTest.testCurriculumId).toBe(1_005)
  })

  it('학습자 변경에서 늦게 끝난 이전 목록 응답을 무시한다', async () => {
    const oldList = deferred<readonly TestListItem[]>()
    const mock = new MockTestRepository()
    const getTests = vi
      .fn()
      .mockReturnValueOnce(oldList.promise)
      .mockResolvedValueOnce(await mock.getTests(2))
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests,
        getTest: vi.fn().mockImplementation((studentId, id, options) =>
          mock.getTest(studentId, id, options),
        ),
        compareTests: vi.fn().mockImplementation((studentId, id, ids, options) =>
          mock.compareTests(studentId, id, ids, options),
        ),
      }),
    )

    const firstRequest = store.loadForStudent(1)
    await store.loadForStudent(2)
    oldList.resolve(await mock.getTests(1))
    await firstRequest

    expect(store.studentId).toBe(2)
    expect(store.currentTestCurriculumId).toBe(2_001)
  })

  it('403 오류를 권한 안내로 변환하고 고정 결과를 표시하지 않는다', async () => {
    const store = useTestStore()
    store.setRepository(new MockTestRepository({ forbiddenStudentIds: [1] }))

    await store.loadForStudent(1)

    expect(store.listStatus).toBe('error')
    expect(store.listError).toBe('이 학습자의 검사 기록을 볼 권한이 없습니다.')
    expect(store.tests).toEqual([])
  })
})
