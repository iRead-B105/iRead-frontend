import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  testRepository,
  type TestComparison,
  type TestListItem,
  type TestRepository,
  type TestRequestStatus,
} from '@/features/teacher/test'
import { isApiError } from '@/lib/api'

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

function testErrorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.status === 400) return '검사 선택 조건이 올바르지 않습니다.'
  if (error.status === 403) return '이 학습자의 검사 기록을 볼 권한이 없습니다.'
  if (error.status === 404) return '요청한 완료 검사 기록을 찾을 수 없습니다.'
  if (error.status >= 500) return '서버에서 검사 결과를 불러오지 못했습니다.'
  return fallback
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
  const listStatus = ref<TestRequestStatus>('idle')
  const comparisonStatus = ref<TestRequestStatus>('idle')
  const listError = ref<string | null>(null)
  const comparisonError = ref<string | null>(null)

  let listGeneration = 0
  let comparisonGeneration = 0
  let listController: AbortController | null = null
  let comparisonController: AbortController | null = null

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
        test.testId !== currentTestId.value &&
        !comparisonTestIds.value.includes(test.testId),
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
    listController = null
    comparisonController = null
  }

  function clearState(nextStudentId: number | null): void {
    studentId.value = nextStudentId
    tests.value = []
    currentTestId.value = null
    comparisonTestIds.value = []
    comparisonResult.value = null
    listStatus.value = nextStudentId === null ? 'idle' : 'loading'
    comparisonStatus.value = 'idle'
    listError.value = null
    comparisonError.value = null
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
    clearState(nextStudentId)

    try {
      const items = await repository.value.getTests(nextStudentId, {
        signal: controller.signal,
      })
      if (generation !== listGeneration || studentId.value !== nextStudentId) return
      tests.value = [...items].sort(
        (left, right) =>
          right.date.localeCompare(left.date) || right.testId - left.testId,
      )
      currentTestId.value = tests.value[0]?.testId ?? null
      listStatus.value = 'success'
      if (currentTestId.value !== null) {
        await loadComparison(nextStudentId)
      }
    } catch (error) {
      if (isAbortError(error) || generation !== listGeneration) return
      listStatus.value = 'error'
      listError.value = testErrorMessage(
        error,
        '완료된 검사 목록을 불러오지 못했습니다.',
      )
    } finally {
      if (generation === listGeneration) listController = null
    }
  }

  async function retryList(): Promise<void> {
    const currentStudentId = studentId.value
    if (currentStudentId === null) return
    await loadForStudent(currentStudentId)
  }

  async function selectCurrentTest(
    currentStudentId: number,
    nextTestId: number,
  ): Promise<boolean> {
    if (
      currentStudentId !== studentId.value ||
      !tests.value.some((test) => test.testId === nextTestId)
    ) {
      return false
    }
    if (
      currentTestId.value === nextTestId &&
      comparisonStatus.value === 'success'
    ) {
      return true
    }
    currentTestId.value = nextTestId
    comparisonTestIds.value = comparisonTestIds.value.filter(
      (testId) => testId !== nextTestId,
    )
    await loadComparison(currentStudentId)
    return comparisonStatus.value === 'success'
  }

  async function addComparisonTest(
    currentStudentId: number,
    testId: number,
  ): Promise<boolean> {
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

  async function removeComparisonTest(
    currentStudentId: number,
    testId: number,
  ): Promise<boolean> {
    if (
      currentStudentId !== studentId.value ||
      !comparisonTestIds.value.includes(testId)
    ) {
      return false
    }
    comparisonTestIds.value = comparisonTestIds.value.filter(
      (candidate) => candidate !== testId,
    )
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
      comparisonStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || generation !== comparisonGeneration) return
      comparisonStatus.value = 'error'
      comparisonError.value = testErrorMessage(
        error,
        '검사 상세 결과를 불러오지 못했습니다.',
      )
    } finally {
      if (generation === comparisonGeneration) comparisonController = null
    }
  }

  function reset(): void {
    abortRequests()
    listGeneration += 1
    comparisonGeneration += 1
    clearState(null)
  }

  return {
    studentId,
    tests,
    currentTestId,
    comparisonTestIds,
    comparisonResult,
    currentTest,
    comparisonTests,
    availableComparisonTests,
    canAddComparison,
    listStatus,
    comparisonStatus,
    listError,
    comparisonError,
    setRepository,
    loadForStudent,
    retryList,
    selectCurrentTest,
    addComparisonTest,
    removeComparisonTest,
    retryComparison,
    loadComparison,
    reset,
  }
})
