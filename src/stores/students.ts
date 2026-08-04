import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_STUDENT_PAGE_SIZE,
  studentRepository,
  trainingHistoryQueryKey,
  toStudentNavigationItem,
  type StudentAccuracyTrend,
  type StudentCreateInput,
  type StudentDetail,
  type StudentLearningEvent,
  type StudentLearningEventDetail,
  type StudentLearningEventType,
  type StudentLearningSummary,
  type StudentListItem,
  type StudentMutationCommand,
  type StudentNavigationItem,
  type StudentReadingSpeedTrend,
  type StudentRepository,
  type StudentRequestStatus,
  type StudentSummary,
  type StudentTrainingHistory,
  type StudentTrainingHistoryQuery,
  type StudentUpdateInput,
} from '@/features/teacher/student'
import { mapCommonError, type UiError } from '@/features/teacher/error'
import { isAbortError, isApiError } from '@/lib/api'

function errorMessage(error: unknown): string {
  if (!isApiError(error)) return '학습자 정보를 불러오지 못했습니다.'
  return mapCommonError(error)?.message ?? '학습자 정보를 불러오지 못했습니다.'
}

function errorStatus(error: unknown): number | null {
  return isApiError(error) ? error.status : null
}

function insightKey(studentId: number, qualifier: string | number): string {
  return `${studentId}:${qualifier}`
}

function withoutStudentInsightKeys<T>(
  record: Readonly<Record<string, T>>,
  studentId: number,
): Record<string, T> {
  const prefix = `${studentId}:`
  return Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith(prefix)))
}

export const useStudentStore = defineStore('students', () => {
  const repository = ref<StudentRepository>(studentRepository)
  const query = reactive<{
    keyword?: string
    age?: number
    recentDays?: 7 | 30
    page: number
    size: number
  }>({
    keyword: undefined,
    age: undefined,
    recentDays: undefined,
    page: 0,
    size: DEFAULT_STUDENT_PAGE_SIZE,
  })
  const students = ref<readonly StudentListItem[]>([])
  const totalElements = ref(0)
  const totalPages = ref(0)
  const listStatus = ref<StudentRequestStatus>('idle')
  const listError = ref<string | null>(null)
  const listUiError = ref<UiError | null>(null)
  const listStale = ref(true)
  const summary = ref<StudentSummary | null>(null)
  const summaryStatus = ref<StudentRequestStatus>('idle')
  const summaryError = ref<string | null>(null)
  const summaryStale = ref(true)
  const detailsById = ref<Record<number, StudentDetail>>({})
  const detailStatus = ref<StudentRequestStatus>('idle')
  const detailError = ref<string | null>(null)
  const detailStatusById = ref<Record<number, StudentRequestStatus>>({})
  const detailErrorById = ref<Record<number, string | null>>({})
  const detailErrorStatusById = ref<Record<number, number | null>>({})
  const detailStaleById = ref<Record<number, boolean>>({})
  const learningSummaryById = ref<Record<number, StudentLearningSummary>>({})
  const learningSummaryStatusById = ref<Record<number, StudentRequestStatus>>({})
  const learningSummaryErrorById = ref<Record<number, string | null>>({})
  const learningSummaryErrorStatusById = ref<Record<number, number | null>>({})
  const learningEventsById = ref<Record<number, readonly StudentLearningEvent[]>>({})
  const learningEventsStatusById = ref<Record<number, StudentRequestStatus>>({})
  const learningEventsErrorById = ref<Record<number, string | null>>({})
  const learningEventDetailsByKey = ref<Record<string, StudentLearningEventDetail>>({})
  const learningEventDetailStatusByKey = ref<Record<string, StudentRequestStatus>>({})
  const learningEventDetailErrorByKey = ref<Record<string, string | null>>({})
  const learningEventDetailErrorStatusByKey = ref<Record<string, number | null>>({})
  const accuracyTrendById = ref<Record<number, StudentAccuracyTrend>>({})
  const accuracyTrendStatusById = ref<Record<number, StudentRequestStatus>>({})
  const accuracyTrendErrorById = ref<Record<number, string | null>>({})
  const readingSpeedTrendById = ref<Record<number, StudentReadingSpeedTrend>>({})
  const readingSpeedTrendStatusById = ref<Record<number, StudentRequestStatus>>({})
  const readingSpeedTrendErrorById = ref<Record<number, string | null>>({})
  const trainingHistoryByKey = ref<Record<string, StudentTrainingHistory>>({})
  const trainingHistoryStatusByKey = ref<Record<string, StudentRequestStatus>>({})
  const trainingHistoryErrorByKey = ref<Record<string, string | null>>({})

  const navigationQuery = reactive({
    keyword: '',
    page: 0,
    size: DEFAULT_STUDENT_PAGE_SIZE,
  })
  const navigationItemsById = ref<Record<number, StudentNavigationItem>>({})
  const navigationOrder = ref<number[]>([])
  const navigationHasNextPage = ref(false)
  const navigationStatus = ref<StudentRequestStatus>('idle')
  const navigationError = ref<string | null>(null)
  const recentStudentIds = ref<number[]>([])
  const selectedStudentId = ref<number | null>(null)

  let listSequence = 0
  let navigationSequence = 0
  let listController: AbortController | null = null
  let navigationController: AbortController | null = null
  let summaryController: AbortController | null = null
  const detailSequences = new Map<number, number>()
  const learningSummarySequences = new Map<number, number>()
  const learningEventsSequences = new Map<number, number>()
  const learningEventDetailSequences = new Map<string, number>()
  const accuracyTrendSequences = new Map<number, number>()
  const readingSpeedTrendSequences = new Map<number, number>()
  const trainingHistorySequences = new Map<string, number>()

  const navigationItems = computed(() =>
    navigationOrder.value
      .map((studentId) => navigationItemsById.value[studentId])
      .filter((student): student is StudentNavigationItem => Boolean(student)),
  )
  const recentStudents = computed(() =>
    recentStudentIds.value
      .map((studentId) => navigationItemsById.value[studentId])
      .filter((student): student is StudentNavigationItem => Boolean(student)),
  )
  const hasActiveFilters = computed(
    () =>
      Boolean(query.keyword?.trim()) || query.age !== undefined || query.recentDays !== undefined,
  )

  function setRepository(nextRepository: StudentRepository): void {
    repository.value = nextRepository
    reset()
  }

  function setListFilters(filters: { keyword?: string; age?: number; recentDays?: 7 | 30 }): void {
    query.keyword = filters.keyword?.trim() || undefined
    query.age = filters.age
    query.recentDays = filters.recentDays
    query.page = 0
  }

  function setListPage(page: number): void {
    query.page = page
  }

  function clearListFilters(): void {
    query.keyword = undefined
    query.age = undefined
    query.recentDays = undefined
    query.page = 0
  }

  async function requestList(background: boolean): Promise<boolean> {
    const requestSequence = ++listSequence
    listController?.abort()
    const controller = new AbortController()
    listController = controller
    if (!background && students.value.length === 0) listStatus.value = 'loading'
    listError.value = null
    listUiError.value = null

    try {
      const result = await repository.value.list({ ...query }, { signal: controller.signal })
      if (requestSequence !== listSequence) return false

      if (result.totalPages > 0 && query.page >= result.totalPages) {
        query.page = result.totalPages - 1
        return requestList(background)
      }

      students.value = result.students
      query.page = result.page
      query.size = result.size
      totalElements.value = result.totalElements
      totalPages.value = result.totalPages
      listStatus.value = 'success'
      listStale.value = false
      return true
    } catch (error) {
      if (isAbortError(error) || requestSequence !== listSequence) return false
      if (!background) listStatus.value = 'error'
      listStale.value = true
      listUiError.value = mapCommonError(error)
      listError.value = listUiError.value?.message ?? errorMessage(error)
      return false
    } finally {
      if (requestSequence === listSequence) listController = null
    }
  }

  async function loadList(): Promise<void> {
    await requestList(false)
  }

  function refreshList(): Promise<boolean> {
    return requestList(listStatus.value === 'success')
  }

  async function requestSummary(background: boolean): Promise<boolean> {
    summaryController?.abort()
    const controller = new AbortController()
    summaryController = controller
    if (!background && summary.value === null) summaryStatus.value = 'loading'
    summaryError.value = null

    try {
      summary.value = await repository.value.getSummary({ signal: controller.signal })
      summaryStatus.value = 'success'
      summaryStale.value = false
      return true
    } catch (error) {
      if (isAbortError(error)) return false
      if (!background) summaryStatus.value = 'error'
      summaryStale.value = true
      summaryError.value = errorMessage(error)
      return false
    } finally {
      if (summaryController === controller) summaryController = null
    }
  }

  async function loadSummary(): Promise<void> {
    await requestSummary(false)
  }

  function refreshSummary(): Promise<boolean> {
    return requestSummary(summaryStatus.value === 'success')
  }

  function mergeNavigationItems(items: readonly StudentListItem[], resetItems: boolean): void {
    const preservedIds = new Set([
      ...recentStudentIds.value,
      ...(selectedStudentId.value === null ? [] : [selectedStudentId.value]),
    ])
    const nextById = resetItems
      ? Object.fromEntries(
          Object.entries(navigationItemsById.value).filter(([studentId]) =>
            preservedIds.has(Number(studentId)),
          ),
        )
      : { ...navigationItemsById.value }
    const nextOrder = resetItems ? [] : [...navigationOrder.value]

    for (const student of items) {
      nextById[student.studentId] = toStudentNavigationItem(student)
      if (!nextOrder.includes(student.studentId)) nextOrder.push(student.studentId)
    }

    navigationItemsById.value = nextById
    navigationOrder.value = nextOrder
  }

  async function loadNavigation(options: { reset?: boolean } = {}): Promise<void> {
    const resetItems = options.reset ?? false
    if (resetItems) navigationQuery.page = 0

    const requestSequence = ++navigationSequence
    navigationController?.abort()
    const controller = new AbortController()
    navigationController = controller
    navigationStatus.value = 'loading'
    navigationError.value = null

    try {
      const result = await repository.value.list(
        {
          keyword: navigationQuery.keyword,
          page: navigationQuery.page,
          size: navigationQuery.size,
        },
        { signal: controller.signal },
      )
      if (requestSequence !== navigationSequence) return

      mergeNavigationItems(result.students, resetItems)
      navigationQuery.page = result.page
      navigationHasNextPage.value = result.page + 1 < result.totalPages
      navigationStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || requestSequence !== navigationSequence) return
      navigationStatus.value = 'error'
      navigationError.value = errorMessage(error)
    } finally {
      if (requestSequence === navigationSequence) navigationController = null
    }
  }

  async function searchNavigation(keyword: string): Promise<void> {
    navigationQuery.keyword = keyword.trim()
    await loadNavigation({ reset: true })
  }

  async function loadMoreNavigation(): Promise<void> {
    if (!navigationHasNextPage.value || navigationStatus.value === 'loading') return
    navigationQuery.page += 1
    await loadNavigation()
  }

  function rememberStudent(student: StudentNavigationItem): void {
    navigationItemsById.value = {
      ...navigationItemsById.value,
      [student.studentId]: student,
    }
    recentStudentIds.value = [
      student.studentId,
      ...recentStudentIds.value.filter((studentId) => studentId !== student.studentId),
    ].slice(0, 5)
    selectedStudentId.value = student.studentId
  }

  async function loadDetail(studentId: number): Promise<StudentDetail | null> {
    const requestSequence = (detailSequences.get(studentId) ?? 0) + 1
    detailSequences.set(studentId, requestSequence)
    if (!detailsById.value[studentId]) {
      detailStatus.value = 'loading'
      detailStatusById.value = { ...detailStatusById.value, [studentId]: 'loading' }
    }
    detailError.value = null
    detailErrorById.value = { ...detailErrorById.value, [studentId]: null }
    detailErrorStatusById.value = {
      ...detailErrorStatusById.value,
      [studentId]: null,
    }

    try {
      const detail = await repository.value.getDetail(studentId)
      if (detailSequences.get(studentId) !== requestSequence) return null
      detailsById.value = {
        ...detailsById.value,
        [studentId]: detail,
      }
      detailStaleById.value = {
        ...detailStaleById.value,
        [studentId]: false,
      }
      rememberStudent({
        studentId: detail.studentId,
        name: detail.name,
        school: detail.school,
        imageUrl: detail.imageUrl,
      })
      detailStatus.value = 'success'
      detailStatusById.value = { ...detailStatusById.value, [studentId]: 'success' }
      return detail
    } catch (error) {
      if (isAbortError(error) || detailSequences.get(studentId) !== requestSequence) return null
      detailStatus.value = 'error'
      detailError.value = errorMessage(error)
      detailStatusById.value = { ...detailStatusById.value, [studentId]: 'error' }
      detailErrorById.value = {
        ...detailErrorById.value,
        [studentId]: errorMessage(error),
      }
      detailErrorStatusById.value = {
        ...detailErrorStatusById.value,
        [studentId]: errorStatus(error),
      }
      return null
    }
  }

  async function loadLearningSummary(studentId: number): Promise<StudentLearningSummary | null> {
    const requestSequence = (learningSummarySequences.get(studentId) ?? 0) + 1
    learningSummarySequences.set(studentId, requestSequence)
    if (!learningSummaryById.value[studentId]) {
      learningSummaryStatusById.value = {
        ...learningSummaryStatusById.value,
        [studentId]: 'loading',
      }
    }
    learningSummaryErrorById.value = {
      ...learningSummaryErrorById.value,
      [studentId]: null,
    }
    learningSummaryErrorStatusById.value = {
      ...learningSummaryErrorStatusById.value,
      [studentId]: null,
    }

    try {
      const summary = await repository.value.getLearningSummary(studentId)
      if (learningSummarySequences.get(studentId) !== requestSequence) return null
      learningSummaryById.value = {
        ...learningSummaryById.value,
        [studentId]: summary,
      }
      learningSummaryStatusById.value = {
        ...learningSummaryStatusById.value,
        [studentId]: 'success',
      }
      return summary
    } catch (error) {
      if (isAbortError(error) || learningSummarySequences.get(studentId) !== requestSequence) {
        return null
      }
      learningSummaryStatusById.value = {
        ...learningSummaryStatusById.value,
        [studentId]: 'error',
      }
      learningSummaryErrorById.value = {
        ...learningSummaryErrorById.value,
        [studentId]: errorMessage(error),
      }
      learningSummaryErrorStatusById.value = {
        ...learningSummaryErrorStatusById.value,
        [studentId]: errorStatus(error),
      }
      return null
    }
  }

  async function loadLearningEvents(
    studentId: number,
    limit = 3,
  ): Promise<readonly StudentLearningEvent[] | null> {
    const requestSequence = (learningEventsSequences.get(studentId) ?? 0) + 1
    learningEventsSequences.set(studentId, requestSequence)
    if (learningEventsById.value[studentId] === undefined) {
      learningEventsStatusById.value = {
        ...learningEventsStatusById.value,
        [studentId]: 'loading',
      }
    }
    learningEventsErrorById.value = {
      ...learningEventsErrorById.value,
      [studentId]: null,
    }

    try {
      const events = await repository.value.listLearningEvents(studentId, { limit })
      if (learningEventsSequences.get(studentId) !== requestSequence) return null
      learningEventsById.value = {
        ...learningEventsById.value,
        [studentId]: events,
      }
      learningEventsStatusById.value = {
        ...learningEventsStatusById.value,
        [studentId]: 'success',
      }
      return events
    } catch (error) {
      if (isAbortError(error) || learningEventsSequences.get(studentId) !== requestSequence) {
        return null
      }
      learningEventsStatusById.value = {
        ...learningEventsStatusById.value,
        [studentId]: 'error',
      }
      learningEventsErrorById.value = {
        ...learningEventsErrorById.value,
        [studentId]: errorMessage(error),
      }
      return null
    }
  }

  async function loadLearningEvent(
    studentId: number,
    eventType: StudentLearningEventType,
    eventId: number,
  ): Promise<StudentLearningEventDetail | null> {
    const key = insightKey(studentId, `${eventType}:${eventId}`)
    const requestSequence = (learningEventDetailSequences.get(key) ?? 0) + 1
    learningEventDetailSequences.set(key, requestSequence)
    learningEventDetailStatusByKey.value = {
      ...learningEventDetailStatusByKey.value,
      [key]: 'loading',
    }
    learningEventDetailErrorByKey.value = {
      ...learningEventDetailErrorByKey.value,
      [key]: null,
    }
    learningEventDetailErrorStatusByKey.value = {
      ...learningEventDetailErrorStatusByKey.value,
      [key]: null,
    }

    try {
      const event = await repository.value.getLearningEvent(studentId, eventType, eventId)
      if (learningEventDetailSequences.get(key) !== requestSequence) return null
      learningEventDetailsByKey.value = {
        ...learningEventDetailsByKey.value,
        [key]: event,
      }
      learningEventDetailStatusByKey.value = {
        ...learningEventDetailStatusByKey.value,
        [key]: 'success',
      }
      return event
    } catch (error) {
      if (isAbortError(error) || learningEventDetailSequences.get(key) !== requestSequence) {
        return null
      }
      learningEventDetailStatusByKey.value = {
        ...learningEventDetailStatusByKey.value,
        [key]: 'error',
      }
      learningEventDetailErrorByKey.value = {
        ...learningEventDetailErrorByKey.value,
        [key]: errorMessage(error),
      }
      learningEventDetailErrorStatusByKey.value = {
        ...learningEventDetailErrorStatusByKey.value,
        [key]: errorStatus(error),
      }
      return null
    }
  }

  async function loadAccuracyTrend(studentId: number): Promise<StudentAccuracyTrend | null> {
    const requestSequence = (accuracyTrendSequences.get(studentId) ?? 0) + 1
    accuracyTrendSequences.set(studentId, requestSequence)
    const hasExistingTrend = accuracyTrendById.value[studentId] !== undefined
    if (!hasExistingTrend) {
      accuracyTrendStatusById.value = {
        ...accuracyTrendStatusById.value,
        [studentId]: 'loading',
      }
    }
    accuracyTrendErrorById.value = {
      ...accuracyTrendErrorById.value,
      [studentId]: null,
    }

    try {
      const trend = await repository.value.getAccuracyTrend(studentId)
      if (accuracyTrendSequences.get(studentId) !== requestSequence) return null
      accuracyTrendById.value = {
        ...accuracyTrendById.value,
        [studentId]: trend,
      }
      accuracyTrendStatusById.value = {
        ...accuracyTrendStatusById.value,
        [studentId]: 'success',
      }
      return trend
    } catch (error) {
      if (isAbortError(error) || accuracyTrendSequences.get(studentId) !== requestSequence) {
        return null
      }
      accuracyTrendStatusById.value = {
        ...accuracyTrendStatusById.value,
        [studentId]: hasExistingTrend ? 'success' : 'error',
      }
      accuracyTrendErrorById.value = {
        ...accuracyTrendErrorById.value,
        [studentId]: errorMessage(error),
      }
      return null
    }
  }

  async function loadReadingSpeedTrend(
    studentId: number,
  ): Promise<StudentReadingSpeedTrend | null> {
    const requestSequence = (readingSpeedTrendSequences.get(studentId) ?? 0) + 1
    readingSpeedTrendSequences.set(studentId, requestSequence)
    const hasExistingTrend = readingSpeedTrendById.value[studentId] !== undefined
    if (!hasExistingTrend) {
      readingSpeedTrendStatusById.value = {
        ...readingSpeedTrendStatusById.value,
        [studentId]: 'loading',
      }
    }
    readingSpeedTrendErrorById.value = {
      ...readingSpeedTrendErrorById.value,
      [studentId]: null,
    }

    try {
      const trend = await repository.value.getReadingSpeedTrend(studentId)
      if (readingSpeedTrendSequences.get(studentId) !== requestSequence) return null
      readingSpeedTrendById.value = {
        ...readingSpeedTrendById.value,
        [studentId]: trend,
      }
      readingSpeedTrendStatusById.value = {
        ...readingSpeedTrendStatusById.value,
        [studentId]: 'success',
      }
      return trend
    } catch (error) {
      if (isAbortError(error) || readingSpeedTrendSequences.get(studentId) !== requestSequence) {
        return null
      }
      readingSpeedTrendStatusById.value = {
        ...readingSpeedTrendStatusById.value,
        [studentId]: hasExistingTrend ? 'success' : 'error',
      }
      readingSpeedTrendErrorById.value = {
        ...readingSpeedTrendErrorById.value,
        [studentId]: errorMessage(error),
      }
      return null
    }
  }

  async function loadTrainingHistory(
    studentId: number,
    query: StudentTrainingHistoryQuery,
  ): Promise<StudentTrainingHistory | null> {
    const key = insightKey(studentId, trainingHistoryQueryKey(query))
    const requestSequence = (trainingHistorySequences.get(key) ?? 0) + 1
    trainingHistorySequences.set(key, requestSequence)
    trainingHistoryStatusByKey.value = {
      ...trainingHistoryStatusByKey.value,
      [key]: 'loading',
    }
    trainingHistoryErrorByKey.value = {
      ...trainingHistoryErrorByKey.value,
      [key]: null,
    }

    try {
      const history = await repository.value.getTrainingHistory(studentId, query)
      if (trainingHistorySequences.get(key) !== requestSequence) return null
      trainingHistoryByKey.value = {
        ...trainingHistoryByKey.value,
        [key]: history,
      }
      trainingHistoryStatusByKey.value = {
        ...trainingHistoryStatusByKey.value,
        [key]: 'success',
      }
      return history
    } catch (error) {
      if (isAbortError(error) || trainingHistorySequences.get(key) !== requestSequence) {
        return null
      }
      trainingHistoryStatusByKey.value = {
        ...trainingHistoryStatusByKey.value,
        [key]: 'error',
      }
      trainingHistoryErrorByKey.value = {
        ...trainingHistoryErrorByKey.value,
        [key]: errorMessage(error),
      }
      return null
    }
  }

  async function saveTeacherMemo(studentId: number, teacherMemo: string | null): Promise<void> {
    await repository.value.updateTeacherMemo(studentId, teacherMemo)
    const current = detailsById.value[studentId]
    if (current) {
      detailsById.value = {
        ...detailsById.value,
        [studentId]: {
          ...current,
          teacherMemo,
        },
      }
      return
    }
    await loadDetail(studentId)
  }

  function markListAndSummaryStale(): void {
    listStale.value = true
    summaryStale.value = true
  }

  async function createStudent(
    command: StudentMutationCommand<StudentCreateInput>,
  ): Promise<number> {
    const studentId = await repository.value.create(command)
    markListAndSummaryStale()
    return studentId
  }

  async function updateStudent(
    studentId: number,
    command: StudentMutationCommand<StudentUpdateInput>,
  ): Promise<StudentDetail> {
    await repository.value.update(studentId, command)
    listStale.value = true
    detailStaleById.value = {
      ...detailStaleById.value,
      [studentId]: true,
    }

    const detail = await repository.value.getDetail(studentId)
    detailsById.value = {
      ...detailsById.value,
      [studentId]: detail,
    }
    detailStaleById.value = {
      ...detailStaleById.value,
      [studentId]: false,
    }
    rememberStudent({
      studentId: detail.studentId,
      name: detail.name,
      school: detail.school,
      imageUrl: detail.imageUrl,
    })
    return detail
  }

  async function deleteStudent(studentId: number): Promise<void> {
    await repository.value.remove(studentId)
    const nextDetails = { ...detailsById.value }
    const nextDetailStale = { ...detailStaleById.value }
    const nextNavigationItems = { ...navigationItemsById.value }
    const nextDetailStatuses = { ...detailStatusById.value }
    const nextDetailErrors = { ...detailErrorById.value }
    const nextDetailErrorStatuses = { ...detailErrorStatusById.value }
    const nextLearningSummaries = { ...learningSummaryById.value }
    const nextLearningSummaryStatuses = { ...learningSummaryStatusById.value }
    const nextLearningSummaryErrors = { ...learningSummaryErrorById.value }
    const nextLearningSummaryErrorStatuses = { ...learningSummaryErrorStatusById.value }
    const nextLearningEvents = { ...learningEventsById.value }
    const nextLearningEventsStatuses = { ...learningEventsStatusById.value }
    const nextLearningEventsErrors = { ...learningEventsErrorById.value }
    const nextAccuracyTrends = { ...accuracyTrendById.value }
    const nextAccuracyTrendStatuses = { ...accuracyTrendStatusById.value }
    const nextAccuracyTrendErrors = { ...accuracyTrendErrorById.value }
    const nextReadingSpeedTrends = { ...readingSpeedTrendById.value }
    const nextReadingSpeedTrendStatuses = { ...readingSpeedTrendStatusById.value }
    const nextReadingSpeedTrendErrors = { ...readingSpeedTrendErrorById.value }
    delete nextDetails[studentId]
    delete nextDetailStale[studentId]
    delete nextNavigationItems[studentId]
    delete nextDetailStatuses[studentId]
    delete nextDetailErrors[studentId]
    delete nextDetailErrorStatuses[studentId]
    delete nextLearningSummaries[studentId]
    delete nextLearningSummaryStatuses[studentId]
    delete nextLearningSummaryErrors[studentId]
    delete nextLearningSummaryErrorStatuses[studentId]
    delete nextLearningEvents[studentId]
    delete nextLearningEventsStatuses[studentId]
    delete nextLearningEventsErrors[studentId]
    delete nextAccuracyTrends[studentId]
    delete nextAccuracyTrendStatuses[studentId]
    delete nextAccuracyTrendErrors[studentId]
    delete nextReadingSpeedTrends[studentId]
    delete nextReadingSpeedTrendStatuses[studentId]
    delete nextReadingSpeedTrendErrors[studentId]
    detailsById.value = nextDetails
    detailStaleById.value = nextDetailStale
    navigationItemsById.value = nextNavigationItems
    detailStatusById.value = nextDetailStatuses
    detailErrorById.value = nextDetailErrors
    detailErrorStatusById.value = nextDetailErrorStatuses
    learningSummaryById.value = nextLearningSummaries
    learningSummaryStatusById.value = nextLearningSummaryStatuses
    learningSummaryErrorById.value = nextLearningSummaryErrors
    learningSummaryErrorStatusById.value = nextLearningSummaryErrorStatuses
    learningEventsById.value = nextLearningEvents
    learningEventsStatusById.value = nextLearningEventsStatuses
    learningEventsErrorById.value = nextLearningEventsErrors
    learningEventDetailsByKey.value = withoutStudentInsightKeys(
      learningEventDetailsByKey.value,
      studentId,
    )
    learningEventDetailStatusByKey.value = withoutStudentInsightKeys(
      learningEventDetailStatusByKey.value,
      studentId,
    )
    learningEventDetailErrorByKey.value = withoutStudentInsightKeys(
      learningEventDetailErrorByKey.value,
      studentId,
    )
    learningEventDetailErrorStatusByKey.value = withoutStudentInsightKeys(
      learningEventDetailErrorStatusByKey.value,
      studentId,
    )
    accuracyTrendById.value = nextAccuracyTrends
    accuracyTrendStatusById.value = nextAccuracyTrendStatuses
    accuracyTrendErrorById.value = nextAccuracyTrendErrors
    readingSpeedTrendById.value = nextReadingSpeedTrends
    readingSpeedTrendStatusById.value = nextReadingSpeedTrendStatuses
    readingSpeedTrendErrorById.value = nextReadingSpeedTrendErrors
    trainingHistoryByKey.value = withoutStudentInsightKeys(trainingHistoryByKey.value, studentId)
    trainingHistoryStatusByKey.value = withoutStudentInsightKeys(
      trainingHistoryStatusByKey.value,
      studentId,
    )
    trainingHistoryErrorByKey.value = withoutStudentInsightKeys(
      trainingHistoryErrorByKey.value,
      studentId,
    )
    navigationOrder.value = navigationOrder.value.filter((id) => id !== studentId)
    recentStudentIds.value = recentStudentIds.value.filter((id) => id !== studentId)
    if (selectedStudentId.value === studentId) selectedStudentId.value = null
    markListAndSummaryStale()
  }

  function reset(): void {
    listController?.abort()
    navigationController?.abort()
    summaryController?.abort()
    listSequence += 1
    navigationSequence += 1

    query.keyword = undefined
    query.age = undefined
    query.recentDays = undefined
    query.page = 0
    query.size = DEFAULT_STUDENT_PAGE_SIZE
    students.value = []
    totalElements.value = 0
    totalPages.value = 0
    listStatus.value = 'idle'
    listError.value = null
    listUiError.value = null
    listStale.value = true
    summary.value = null
    summaryStatus.value = 'idle'
    summaryError.value = null
    summaryStale.value = true
    detailsById.value = {}
    detailStatus.value = 'idle'
    detailError.value = null
    detailStatusById.value = {}
    detailErrorById.value = {}
    detailErrorStatusById.value = {}
    detailStaleById.value = {}
    learningSummaryById.value = {}
    learningSummaryStatusById.value = {}
    learningSummaryErrorById.value = {}
    learningSummaryErrorStatusById.value = {}
    learningEventsById.value = {}
    learningEventsStatusById.value = {}
    learningEventsErrorById.value = {}
    learningEventDetailsByKey.value = {}
    learningEventDetailStatusByKey.value = {}
    learningEventDetailErrorByKey.value = {}
    learningEventDetailErrorStatusByKey.value = {}
    accuracyTrendById.value = {}
    accuracyTrendStatusById.value = {}
    accuracyTrendErrorById.value = {}
    readingSpeedTrendById.value = {}
    readingSpeedTrendStatusById.value = {}
    readingSpeedTrendErrorById.value = {}
    trainingHistoryByKey.value = {}
    trainingHistoryStatusByKey.value = {}
    trainingHistoryErrorByKey.value = {}
    detailSequences.clear()
    learningSummarySequences.clear()
    learningEventsSequences.clear()
    learningEventDetailSequences.clear()
    accuracyTrendSequences.clear()
    readingSpeedTrendSequences.clear()
    trainingHistorySequences.clear()

    navigationQuery.keyword = ''
    navigationQuery.page = 0
    navigationQuery.size = DEFAULT_STUDENT_PAGE_SIZE
    navigationItemsById.value = {}
    navigationOrder.value = []
    navigationHasNextPage.value = false
    navigationStatus.value = 'idle'
    navigationError.value = null
    recentStudentIds.value = []
    selectedStudentId.value = null
  }

  return {
    query,
    students,
    totalElements,
    totalPages,
    listStatus,
    listError,
    listUiError,
    listStale,
    summary,
    summaryStatus,
    summaryError,
    summaryStale,
    detailsById,
    detailStatus,
    detailError,
    detailStatusById,
    detailErrorById,
    detailErrorStatusById,
    detailStaleById,
    learningSummaryById,
    learningSummaryStatusById,
    learningSummaryErrorById,
    learningSummaryErrorStatusById,
    learningEventsById,
    learningEventsStatusById,
    learningEventsErrorById,
    learningEventDetailsByKey,
    learningEventDetailStatusByKey,
    learningEventDetailErrorByKey,
    learningEventDetailErrorStatusByKey,
    accuracyTrendById,
    accuracyTrendStatusById,
    accuracyTrendErrorById,
    readingSpeedTrendById,
    readingSpeedTrendStatusById,
    readingSpeedTrendErrorById,
    trainingHistoryByKey,
    trainingHistoryStatusByKey,
    trainingHistoryErrorByKey,
    navigationQuery,
    navigationItemsById,
    navigationItems,
    navigationHasNextPage,
    navigationStatus,
    navigationError,
    recentStudentIds,
    selectedStudentId,
    recentStudents,
    hasActiveFilters,
    setRepository,
    setListFilters,
    setListPage,
    clearListFilters,
    loadList,
    refreshList,
    loadSummary,
    refreshSummary,
    loadNavigation,
    searchNavigation,
    loadMoreNavigation,
    rememberStudent,
    loadDetail,
    loadLearningSummary,
    loadLearningEvents,
    loadLearningEvent,
    loadAccuracyTrend,
    loadReadingSpeedTrend,
    loadTrainingHistory,
    saveTeacherMemo,
    createStudent,
    updateStudent,
    deleteStudent,
    insightKey,
    reset,
  }
})
