import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { GazeAnalysisRequestStatus, GazeAnalysisState } from '@/features/teacher/gaze'
import {
  testRepository,
  type TestComparison,
  type TestDetail,
  type TestGazeResult,
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
  if (error.status === 404) return '요청한 완료 검사 기록을 찾을 수 없습니다.'
  return mapCommonError(error)?.message ?? fallback
}

function sameIds(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}

export const useTestStore = defineStore('test', () => {
  const repository = shallowRef<TestRepository>(testRepository)
  const studentId = ref<number | null>(null)
  const tests = ref<readonly TestListItem[]>([])
  const currentTestId = ref<number | null>(null)
  const comparisonTestIds = ref<readonly number[]>([])
  const comparisonResult = ref<TestComparison | null>(null)
  const trendDetails = ref<readonly TestDetail[]>([])
  const trendGazeResults = ref<readonly TestGazeResult[]>([])
  const gazeAnalysis = ref<GazeAnalysisState | null>(null)
  const listStatus = ref<TestRequestStatus>('idle')
  const comparisonStatus = ref<TestRequestStatus>('idle')
  const trendStatus = ref<TestRequestStatus>('idle')
  const gazeStatus = ref<GazeAnalysisRequestStatus>('idle')
  const listError = ref<string | null>(null)
  const listUiError = ref<UiError | null>(null)
  const comparisonError = ref<string | null>(null)
  const trendError = ref<string | null>(null)
  const trendFailedCount = ref(0)
  const trendGazeFailedCount = ref(0)
  const gazeError = ref<string | null>(null)

  let listGeneration = 0
  let comparisonGeneration = 0
  let trendGeneration = 0
  let gazeGeneration = 0
  let listController: AbortController | null = null
  let comparisonController: AbortController | null = null
  let trendController: AbortController | null = null
  let gazeController: AbortController | null = null
  const detailCache = new Map<string, TestDetail>()
  const gazeCache = new Map<string, GazeAnalysisState>()

  function detailCacheKey(currentStudentId: number, testId: number): string {
    return `${currentStudentId}:${testId}`
  }

  function cacheComparison(currentStudentId: number, result: TestComparison): void {
    for (const detail of [result.currentTest, ...result.comparisonTests]) {
      detailCache.set(detailCacheKey(currentStudentId, detail.testId), detail)
    }
  }

  const currentTest = computed(
    () => tests.value.find((test) => test.testId === currentTestId.value) ?? null,
  )
  const comparisonTests = computed(() =>
    comparisonTestIds.value
      .map((testId) => tests.value.find((test) => test.testId === testId))
      .filter((test): test is TestListItem => test !== undefined),
  )
  const availableComparisonTests = computed(() =>
    tests.value.filter(
      (test) =>
        test.testId !== currentTestId.value && !comparisonTestIds.value.includes(test.testId),
    ),
  )
  const canAddComparison = computed(
    () =>
      comparisonTestIds.value.length < 2 &&
      availableComparisonTests.value.length > 0 &&
      comparisonStatus.value !== 'loading',
  )

  function abortRequests(): void {
    listController?.abort()
    comparisonController?.abort()
    trendController?.abort()
    gazeController?.abort()
    listController = null
    comparisonController = null
    trendController = null
    gazeController = null
  }

  function clearState(nextStudentId: number | null): void {
    studentId.value = nextStudentId
    tests.value = []
    currentTestId.value = null
    comparisonTestIds.value = []
    comparisonResult.value = null
    trendDetails.value = []
    trendGazeResults.value = []
    gazeAnalysis.value = null
    listStatus.value = nextStudentId === null ? 'idle' : 'loading'
    comparisonStatus.value = 'idle'
    trendStatus.value = 'idle'
    gazeStatus.value = 'idle'
    listError.value = null
    listUiError.value = null
    comparisonError.value = null
    trendError.value = null
    trendFailedCount.value = 0
    trendGazeFailedCount.value = 0
    gazeError.value = null
  }

  function setRepository(nextRepository: TestRepository): void {
    repository.value = nextRepository
    reset()
  }

  async function loadForStudent(nextStudentId: number): Promise<void> {
    abortRequests()
    const controller = new AbortController()
    listController = controller
    const generation = ++listGeneration
    comparisonGeneration += 1
    trendGeneration += 1
    gazeGeneration += 1
    const isRefresh = studentId.value === nextStudentId
    if (isRefresh) {
      listStatus.value = 'loading'
      listError.value = null
      listUiError.value = null
    } else {
      clearState(nextStudentId)
    }

    try {
      const items = await repository.value.getTests(nextStudentId, {
        signal: controller.signal,
      })
      if (generation !== listGeneration || studentId.value !== nextStudentId) return
      tests.value = [...items].sort(
        (left, right) => right.date.localeCompare(left.date) || right.testId - left.testId,
      )
      const retainedCurrentTestId = tests.value.some((test) => test.testId === currentTestId.value)
        ? currentTestId.value
        : null
      currentTestId.value = retainedCurrentTestId ?? tests.value[0]?.testId ?? null
      comparisonTestIds.value = comparisonTestIds.value
        .filter(
          (testId) =>
            testId !== currentTestId.value && tests.value.some((test) => test.testId === testId),
        )
        .slice(0, 2)
      listStatus.value = 'success'
      if (currentTestId.value !== null) {
        await loadComparison(nextStudentId)
        if (generation !== listGeneration || studentId.value !== nextStudentId) return
        await loadGazeAnalysis(nextStudentId, currentTestId.value)
        if (generation !== listGeneration || studentId.value !== nextStudentId) return
        await loadTrend(nextStudentId)
      } else {
        comparisonResult.value = null
        trendDetails.value = []
        trendGazeResults.value = []
        gazeAnalysis.value = null
        comparisonStatus.value = 'idle'
        trendStatus.value = 'idle'
        gazeStatus.value = 'idle'
      }
    } catch (error) {
      if (isAbortError(error) || generation !== listGeneration) return
      listStatus.value = 'error'
      listUiError.value = mapCommonError(error)
      listError.value = testErrorMessage(error, '완료된 검사 목록을 불러오지 못했습니다.')
    } finally {
      if (generation === listGeneration) listController = null
    }
  }

  async function retryList(): Promise<void> {
    const currentStudentId = studentId.value
    if (currentStudentId === null) return
    await loadForStudent(currentStudentId)
  }

  async function selectCurrentTest(currentStudentId: number, nextTestId: number): Promise<boolean> {
    if (
      currentStudentId !== studentId.value ||
      !tests.value.some((test) => test.testId === nextTestId)
    ) {
      return false
    }
    if (currentTestId.value === nextTestId && comparisonStatus.value === 'success') {
      return true
    }
    currentTestId.value = nextTestId
    comparisonTestIds.value = comparisonTestIds.value.filter((testId) => testId !== nextTestId)
    trendController?.abort()
    trendController = null
    trendGeneration += 1
    await Promise.all([
      loadComparison(currentStudentId),
      loadGazeAnalysis(currentStudentId, nextTestId),
      loadTrend(currentStudentId),
    ])
    return comparisonStatus.value === 'success'
  }

  async function addComparisonTest(currentStudentId: number, testId: number): Promise<boolean> {
    if (
      currentStudentId !== studentId.value ||
      currentTestId.value === testId ||
      comparisonTestIds.value.includes(testId) ||
      comparisonTestIds.value.length >= 2 ||
      !tests.value.some((test) => test.testId === testId)
    ) {
      return false
    }
    comparisonTestIds.value = [...comparisonTestIds.value, testId]
    await loadComparison(currentStudentId)
    return comparisonStatus.value === 'success'
  }

  async function removeComparisonTest(currentStudentId: number, testId: number): Promise<boolean> {
    if (currentStudentId !== studentId.value || !comparisonTestIds.value.includes(testId)) {
      return false
    }
    comparisonTestIds.value = comparisonTestIds.value.filter((candidate) => candidate !== testId)
    await loadComparison(currentStudentId)
    return comparisonStatus.value === 'success'
  }

  async function retryComparison(): Promise<void> {
    const currentStudentId = studentId.value
    if (currentStudentId === null || currentTestId.value === null) return
    await loadComparison(currentStudentId)
  }

  async function loadComparison(currentStudentId: number): Promise<void> {
    const requestedCurrentTestId = currentTestId.value
    const requestedComparisonTestIds = [...comparisonTestIds.value]
    if (
      currentStudentId !== studentId.value ||
      requestedCurrentTestId === null ||
      !tests.value.some((test) => test.testId === requestedCurrentTestId) ||
      requestedComparisonTestIds.some(
        (testId) => !tests.value.some((test) => test.testId === testId),
      )
    ) {
      return
    }

    comparisonController?.abort()
    const controller = new AbortController()
    comparisonController = controller
    const generation = ++comparisonGeneration
    comparisonResult.value = null
    comparisonStatus.value = 'loading'
    comparisonError.value = null

    try {
      const result = await repository.value.compareTests(
        currentStudentId,
        requestedCurrentTestId,
        requestedComparisonTestIds,
        { signal: controller.signal },
      )
      if (
        generation !== comparisonGeneration ||
        studentId.value !== currentStudentId ||
        currentTestId.value !== requestedCurrentTestId ||
        !sameIds(comparisonTestIds.value, requestedComparisonTestIds)
      ) {
        return
      }
      comparisonResult.value = result
      cacheComparison(currentStudentId, result)
      comparisonStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || generation !== comparisonGeneration) return
      comparisonStatus.value = 'error'
      comparisonError.value = testErrorMessage(error, '검사 상세 결과를 불러오지 못했습니다.')
    } finally {
      if (generation === comparisonGeneration) comparisonController = null
    }
  }

  async function loadTrend(currentStudentId: number): Promise<void> {
    if (currentStudentId !== studentId.value || tests.value.length === 0) return

    trendController?.abort()
    const controller = new AbortController()
    trendController = controller
    const generation = ++trendGeneration
    const requestedTests = [...tests.value]
    trendStatus.value = 'loading'
    trendError.value = null
    trendFailedCount.value = 0
    trendGazeFailedCount.value = 0

    const missingTests = requestedTests.filter(
      (test) => !detailCache.has(detailCacheKey(currentStudentId, test.testId)),
    )
    const missingGazeTests = requestedTests.filter(
      (test) => !gazeCache.has(detailCacheKey(currentStudentId, test.testId)),
    )
    let failedDetailCount = 0
    let failedGazeCount = 0
    const tasks: Array<() => Promise<void>> = [
      ...missingTests.map(
        (test) => async () => {
          controller.signal.throwIfAborted()
          try {
            const result = await repository.value.compareTests(currentStudentId, test.testId, [], {
              signal: controller.signal,
            })
            detailCache.set(
              detailCacheKey(currentStudentId, result.currentTest.testId),
              result.currentTest,
            )
          } catch (error) {
            if (isAbortError(error)) throw error
            failedDetailCount += 1
          }
        },
      ),
      ...missingGazeTests.map(
        (test) => async () => {
          controller.signal.throwIfAborted()
          try {
            const state = await repository.value.getGazeAnalysis(
              currentStudentId,
              test.testId,
              { signal: controller.signal },
            )
            gazeCache.set(detailCacheKey(currentStudentId, test.testId), state)
          } catch (error) {
            if (isAbortError(error)) throw error
            failedGazeCount += 1
          }
        },
      ),
    ]
    let taskCursor = 0

    async function worker(): Promise<void> {
      while (taskCursor < tasks.length) {
        const task = tasks[taskCursor]
        taskCursor += 1
        if (!task) return
        controller.signal.throwIfAborted()
        try {
          await task()
        } catch (error) {
          if (isAbortError(error)) throw error
          throw error
        }
      }
    }

    try {
      const workerCount = Math.min(3, tasks.length)
      await Promise.all(Array.from({ length: workerCount }, () => worker()))
      if (generation !== trendGeneration || studentId.value !== currentStudentId) return

      trendDetails.value = requestedTests
        .map((test) => detailCache.get(detailCacheKey(currentStudentId, test.testId)))
        .filter((detail): detail is TestDetail => detail !== undefined)
        .sort((left, right) => left.date.localeCompare(right.date) || left.testId - right.testId)
      trendGazeResults.value = requestedTests
        .map((test) => {
          const state = gazeCache.get(detailCacheKey(currentStudentId, test.testId))
          return state ? { testId: test.testId, state } : null
        })
        .filter((result): result is TestGazeResult => result !== null)
      trendFailedCount.value = failedDetailCount
      trendGazeFailedCount.value = failedGazeCount

      if (trendDetails.value.length === 0) {
        trendStatus.value = 'error'
        trendError.value = '검사 평균을 계산할 결과를 불러오지 못했습니다.'
      } else {
        trendStatus.value = 'success'
        const failures = [
          failedDetailCount > 0 ? `검사 상세 ${failedDetailCount}건` : null,
          failedGazeCount > 0 ? `시선 분석 ${failedGazeCount}건` : null,
        ].filter((message): message is string => message !== null)
        trendError.value =
          failures.length > 0
            ? `일부 ${failures.join(', ')}을 불러오지 못해 확인 가능한 결과만 표시합니다.`
            : null
      }
    } catch (error) {
      if (isAbortError(error) || generation !== trendGeneration) return
      trendStatus.value = 'error'
      trendError.value = testErrorMessage(error, '검사 평균을 계산할 결과를 불러오지 못했습니다.')
    } finally {
      if (generation === trendGeneration) trendController = null
    }
  }

  async function retryTrend(): Promise<void> {
    const currentStudentId = studentId.value
    if (currentStudentId === null) return
    await loadTrend(currentStudentId)
  }

  async function loadGazeAnalysis(
    currentStudentId: number,
    testId: number,
    force = false,
  ): Promise<void> {
    if (
      currentStudentId !== studentId.value ||
      currentTestId.value !== testId ||
      !tests.value.some((test) => test.testId === testId)
    ) {
      return
    }
    const cached = gazeCache.get(detailCacheKey(currentStudentId, testId))
    if (cached && !force) {
      gazeAnalysis.value = cached
      gazeStatus.value = 'success'
      gazeError.value = null
      return
    }
    gazeController?.abort()
    const controller = new AbortController()
    gazeController = controller
    const generation = ++gazeGeneration
    gazeAnalysis.value = null
    gazeStatus.value = 'loading'
    gazeError.value = null

    try {
      const state = await repository.value.getGazeAnalysis(currentStudentId, testId, {
        signal: controller.signal,
      })
      if (
        generation !== gazeGeneration ||
        studentId.value !== currentStudentId ||
        currentTestId.value !== testId
      ) {
        return
      }
      gazeCache.set(detailCacheKey(currentStudentId, testId), state)
      gazeAnalysis.value = state
      gazeStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || generation !== gazeGeneration) return
      gazeStatus.value = 'error'
      gazeError.value = testErrorMessage(error, '시선 분석 결과를 불러오지 못했습니다.')
    } finally {
      if (generation === gazeGeneration) gazeController = null
    }
  }

  async function retryGazeAnalysis(): Promise<void> {
    const currentStudentId = studentId.value
    const testId = currentTestId.value
    if (currentStudentId === null || testId === null) return
    await loadGazeAnalysis(currentStudentId, testId, true)
  }

  function reset(): void {
    abortRequests()
    listGeneration += 1
    comparisonGeneration += 1
    trendGeneration += 1
    gazeGeneration += 1
    detailCache.clear()
    gazeCache.clear()
    clearState(null)
  }

  return {
    studentId,
    tests,
    currentTestId,
    comparisonTestIds,
    comparisonResult,
    trendDetails,
    trendGazeResults,
    gazeAnalysis,
    currentTest,
    comparisonTests,
    availableComparisonTests,
    canAddComparison,
    listStatus,
    comparisonStatus,
    trendStatus,
    gazeStatus,
    listError,
    listUiError,
    comparisonError,
    trendError,
    trendFailedCount,
    trendGazeFailedCount,
    gazeError,
    setRepository,
    loadForStudent,
    retryList,
    selectCurrentTest,
    addComparisonTest,
    removeComparisonTest,
    retryComparison,
    loadComparison,
    loadTrend,
    retryTrend,
    loadGazeAnalysis,
    retryGazeAnalysis,
    reset,
  }
})
