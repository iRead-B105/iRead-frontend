import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  testRepository,
  type TestComparison,
  type TestDetail,
  type TestListItem,
  type TestRepository,
  type TestRequestStatus,
} from '@/features/teacher/test'
import { mapCommonError, type UiError } from '@/features/teacher/error'
import { isAbortError, isApiError } from '@/lib/api'

function testErrorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback
  if (error.status === 400) return '검사 선택 조건이 올바르지 않습니다.'
  if (error.status === 403) return '이 학습자의 검사 기록을 볼 권한이 없습니다.'
  if (error.status === 404) return '요청한 실력 도전 검사 기록을 찾을 수 없습니다.'
  if (error.status === 409) return '검사 결과가 변경되었습니다. 최신 내용을 다시 불러와 주세요.'
  return mapCommonError(error)?.message ?? fallback
}

function sameIds(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}

export const useTestStore = defineStore('test', () => {
  const repository = shallowRef<TestRepository>(testRepository)
  const studentId = ref<number | null>(null)
  const tests = ref<readonly TestListItem[]>([])
  const currentTestCurriculumId = ref<number | null>(null)
  const comparisonTestCurriculumIds = ref<readonly number[]>([])
  const comparisonResult = ref<TestComparison | null>(null)
  const trendDetails = ref<readonly TestDetail[]>([])
  const listStatus = ref<TestRequestStatus>('idle')
  const comparisonStatus = ref<TestRequestStatus>('idle')
  const trendStatus = ref<TestRequestStatus>('idle')
  const listError = ref<string | null>(null)
  const listUiError = ref<UiError | null>(null)
  const comparisonError = ref<string | null>(null)
  const trendError = ref<string | null>(null)
  const trendFailedCount = ref(0)

  let listGeneration = 0
  let comparisonGeneration = 0
  let trendGeneration = 0
  let listController: AbortController | null = null
  let comparisonController: AbortController | null = null
  let trendController: AbortController | null = null
  const detailCache = new Map<string, TestDetail>()

  const currentTest = computed(
    () =>
      tests.value.find(
        (test) => test.testCurriculumId === currentTestCurriculumId.value,
      ) ?? null,
  )
  const comparisonTests = computed(() =>
    comparisonTestCurriculumIds.value.flatMap((id) => {
      const test = tests.value.find((item) => item.testCurriculumId === id)
      return test ? [test] : []
    }),
  )
  const availableComparisonTests = computed(() =>
    tests.value.filter(
      (test) =>
        test.testCurriculumId !== currentTestCurriculumId.value &&
        !comparisonTestCurriculumIds.value.includes(test.testCurriculumId),
    ),
  )
  const canAddComparison = computed(
    () =>
      comparisonTestCurriculumIds.value.length < 2 &&
      availableComparisonTests.value.length > 0 &&
      comparisonStatus.value !== 'loading',
  )

  function cacheKey(currentStudentId: number, testCurriculumId: number): string {
    return `${currentStudentId}:${testCurriculumId}`
  }

  function cacheDetails(currentStudentId: number, details: readonly TestDetail[]): void {
    for (const detail of details) {
      detailCache.set(cacheKey(currentStudentId, detail.testCurriculumId), detail)
    }
  }

  function abortRequests(): void {
    listController?.abort()
    comparisonController?.abort()
    trendController?.abort()
    listController = null
    comparisonController = null
    trendController = null
  }

  function clearState(nextStudentId: number | null): void {
    studentId.value = nextStudentId
    tests.value = []
    currentTestCurriculumId.value = null
    comparisonTestCurriculumIds.value = []
    comparisonResult.value = null
    trendDetails.value = []
    listStatus.value = nextStudentId === null ? 'idle' : 'loading'
    comparisonStatus.value = 'idle'
    trendStatus.value = 'idle'
    listError.value = null
    listUiError.value = null
    comparisonError.value = null
    trendError.value = null
    trendFailedCount.value = 0
    detailCache.clear()
  }

  function setRepository(nextRepository: TestRepository): void {
    repository.value = nextRepository
    reset()
  }

  async function loadForStudent(nextStudentId: number): Promise<void> {
    abortRequests()
    const generation = ++listGeneration
    comparisonGeneration += 1
    trendGeneration += 1
    clearState(nextStudentId)
    const controller = new AbortController()
    listController = controller
    try {
      const items = await repository.value.getTests(nextStudentId, {
        signal: controller.signal,
      })
      if (generation !== listGeneration || studentId.value !== nextStudentId) return
      tests.value = [...items]
      listStatus.value = 'success'
      currentTestCurriculumId.value = items[0]?.testCurriculumId ?? null
      if (currentTestCurriculumId.value !== null) {
        await Promise.all([loadComparison(nextStudentId), loadTrend(nextStudentId)])
      }
    } catch (error) {
      if (isAbortError(error) || generation !== listGeneration) return
      listStatus.value = 'error'
      listUiError.value = mapCommonError(error)
      listError.value = testErrorMessage(error, '완료된 실력 도전 검사 목록을 불러오지 못했습니다.')
    } finally {
      if (listController === controller) listController = null
    }
  }

  async function retryList(): Promise<void> {
    if (studentId.value === null || listStatus.value === 'loading') return
    const currentStudentId = studentId.value
    const previousTests = tests.value
    const previousCurrentId = currentTestCurriculumId.value
    listStatus.value = 'loading'
    listError.value = null
    listUiError.value = null
    const controller = new AbortController()
    listController?.abort()
    listController = controller
    const generation = ++listGeneration
    try {
      const items = await repository.value.getTests(currentStudentId, {
        signal: controller.signal,
      })
      if (generation !== listGeneration || studentId.value !== currentStudentId) return
      tests.value = [...items]
      listStatus.value = 'success'
      if (items.length === 0) {
        currentTestCurriculumId.value = null
        comparisonTestCurriculumIds.value = []
        comparisonResult.value = null
        trendDetails.value = []
        comparisonStatus.value = 'idle'
        trendStatus.value = 'idle'
        return
      }
      const nextCurrentId = items.some(
        (item) => item.testCurriculumId === previousCurrentId,
      )
        ? previousCurrentId!
        : items[0]!.testCurriculumId
      currentTestCurriculumId.value = nextCurrentId
      comparisonTestCurriculumIds.value = comparisonTestCurriculumIds.value.filter((id) =>
        items.some((item) => item.testCurriculumId === id && id !== nextCurrentId),
      )
      await Promise.all([loadComparison(currentStudentId), loadTrend(currentStudentId)])
    } catch (error) {
      if (isAbortError(error) || generation !== listGeneration) return
      tests.value = previousTests
      listStatus.value = 'error'
      listUiError.value = mapCommonError(error)
      listError.value = testErrorMessage(error, '최신 검사 목록을 불러오지 못했습니다.')
    } finally {
      if (listController === controller) listController = null
    }
  }

  async function selectCurrentTest(
    currentStudentId: number,
    nextTestCurriculumId: number,
  ): Promise<boolean> {
    if (
      studentId.value !== currentStudentId ||
      !tests.value.some((test) => test.testCurriculumId === nextTestCurriculumId)
    ) {
      return false
    }
    currentTestCurriculumId.value = nextTestCurriculumId
    comparisonTestCurriculumIds.value = comparisonTestCurriculumIds.value.filter(
      (id) => id !== nextTestCurriculumId,
    )
    await loadComparison(currentStudentId)
    return comparisonStatus.value === 'success'
  }

  async function addComparisonTest(
    currentStudentId: number,
    testCurriculumId: number,
  ): Promise<boolean> {
    if (
      !canAddComparison.value ||
      !availableComparisonTests.value.some(
        (test) => test.testCurriculumId === testCurriculumId,
      )
    ) {
      return false
    }
    comparisonTestCurriculumIds.value = [
      ...comparisonTestCurriculumIds.value,
      testCurriculumId,
    ]
    await loadComparison(currentStudentId)
    return comparisonStatus.value === 'success'
  }

  async function removeComparisonTest(
    currentStudentId: number,
    testCurriculumId: number,
  ): Promise<boolean> {
    const next = comparisonTestCurriculumIds.value.filter((id) => id !== testCurriculumId)
    if (sameIds(next, comparisonTestCurriculumIds.value)) return false
    comparisonTestCurriculumIds.value = next
    await loadComparison(currentStudentId)
    return comparisonStatus.value === 'success'
  }

  async function retryComparison(): Promise<void> {
    if (studentId.value !== null) await loadComparison(studentId.value)
  }

  async function loadComparison(currentStudentId: number): Promise<void> {
    const currentId = currentTestCurriculumId.value
    if (studentId.value !== currentStudentId || currentId === null) return
    comparisonController?.abort()
    const controller = new AbortController()
    comparisonController = controller
    const generation = ++comparisonGeneration
    comparisonStatus.value = 'loading'
    comparisonError.value = null
    try {
      const result = await repository.value.compareTests(
        currentStudentId,
        currentId,
        comparisonTestCurriculumIds.value,
        { signal: controller.signal },
      )
      if (
        generation !== comparisonGeneration ||
        studentId.value !== currentStudentId ||
        currentTestCurriculumId.value !== currentId
      ) {
        return
      }
      comparisonResult.value = result
      cacheDetails(currentStudentId, [result.currentTest, ...result.comparisonTests])
      comparisonStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || generation !== comparisonGeneration) return
      comparisonResult.value = null
      comparisonStatus.value = 'error'
      comparisonError.value = testErrorMessage(error, '검사 상세 결과를 불러오지 못했습니다.')
    } finally {
      if (comparisonController === controller) comparisonController = null
    }
  }

  async function loadTrend(currentStudentId: number): Promise<void> {
    if (studentId.value !== currentStudentId) return
    trendController?.abort()
    const controller = new AbortController()
    trendController = controller
    const generation = ++trendGeneration
    trendStatus.value = 'loading'
    trendError.value = null
    trendFailedCount.value = 0
    const results = await Promise.allSettled(
      tests.value.map((test) => {
        const cached = detailCache.get(cacheKey(currentStudentId, test.testCurriculumId))
        return cached
          ? Promise.resolve(cached)
          : repository.value.getTest(currentStudentId, test.testCurriculumId, {
              signal: controller.signal,
            })
      }),
    )
    if (generation !== trendGeneration || studentId.value !== currentStudentId) return
    const details = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    )
    const failures = results.length - details.length
    cacheDetails(currentStudentId, details)
    trendDetails.value = details.sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt),
    )
    trendFailedCount.value = failures
    trendStatus.value = details.length > 0 ? 'success' : failures > 0 ? 'error' : 'success'
    trendError.value =
      failures > 0
        ? details.length > 0
          ? `일부 검사 상세 ${failures}건을 불러오지 못해 성공한 결과만 평균에 반영했습니다.`
          : '검사 지표 평균을 계산할 상세 결과를 불러오지 못했습니다.'
        : null
    if (trendController === controller) trendController = null
  }

  async function retryTrend(): Promise<void> {
    if (studentId.value !== null) await loadTrend(studentId.value)
  }

  function reset(): void {
    abortRequests()
    listGeneration += 1
    comparisonGeneration += 1
    trendGeneration += 1
    clearState(null)
  }

  return {
    studentId,
    tests,
    currentTestCurriculumId,
    comparisonTestCurriculumIds,
    comparisonResult,
    trendDetails,
    currentTest,
    comparisonTests,
    availableComparisonTests,
    canAddComparison,
    listStatus,
    comparisonStatus,
    trendStatus,
    listError,
    listUiError,
    comparisonError,
    trendError,
    trendFailedCount,
    setRepository,
    loadForStudent,
    retryList,
    selectCurrentTest,
    addComparisonTest,
    removeComparisonTest,
    retryComparison,
    retryTrend,
    reset,
  }
})
