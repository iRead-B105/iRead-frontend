import { computed, reactive, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_STORY_HISTORY_PAGE_SIZE,
  storyRepository,
  type StoryDetail,
  type StoryGazeAnalysis,
  type StoryHistoryItem,
  type StoryHistoryQuery,
  type StoryRepository,
  type StoryRequestStatus,
  type StoryTemplateOption,
} from '@/features/teacher/story'
import { mapCommonError, type UiError } from '@/features/teacher/error'
import { isAbortError, isApiError } from '@/lib/api'

function defaultErrorMessage(error: unknown, target: 'list' | 'detail' | 'gaze'): string {
  if (isApiError(error)) {
    const mapped = mapCommonError(error)
    if (mapped) return mapped.message
  }
  if (error instanceof TypeError) return error.message
  const messages = {
    list: '이야기 이력을 불러오지 못했습니다.',
    detail: '이야기 상세를 불러오지 못했습니다.',
    gaze: '시선 분석 결과를 불러오지 못했습니다.',
  }
  return messages[target]
}

function assertPositiveId(value: number, field: 'studentId' | 'storyId'): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`[이야기 이력] ${field}는 양의 정수여야 합니다.`)
  }
}

export const useStoryHistoryStore = defineStore('story-history', () => {
  const repository = shallowRef<StoryRepository>(storyRepository)
  const studentId = ref<number | null>(null)
  const query = reactive<{
    from?: string
    to?: string
    storyTemplateId?: number
    page: number
    size: number
  }>({
    from: undefined,
    to: undefined,
    storyTemplateId: undefined,
    page: 0,
    size: DEFAULT_STORY_HISTORY_PAGE_SIZE,
  })
  const storyTemplates = ref<readonly StoryTemplateOption[]>([])
  const stories = ref<readonly StoryHistoryItem[]>([])
  const totalElements = ref(0)
  const totalPages = ref(0)
  const selectedStoryId = ref<number | null>(null)
  const currentPageNo = ref(1)

  const detail = ref<StoryDetail | null>(null)
  const detailStudentId = ref<number | null>(null)
  const gazeAnalysis = ref<StoryGazeAnalysis | null>(null)
  const gazeStudentId = ref<number | null>(null)
  const gazeStoryId = ref<number | null>(null)

  const listStatus = ref<StoryRequestStatus>('idle')
  const detailStatus = ref<StoryRequestStatus>('idle')
  const gazeStatus = ref<StoryRequestStatus>('idle')
  const listError = ref<string | null>(null)
  const detailError = ref<string | null>(null)
  const gazeError = ref<string | null>(null)
  const listUiError = ref<UiError | null>(null)
  const detailUiError = ref<UiError | null>(null)
  const gazeUiError = ref<UiError | null>(null)

  let listSequence = 0
  let detailSequence = 0
  let gazeSequence = 0
  let listController: AbortController | null = null
  let detailController: AbortController | null = null
  let gazeController: AbortController | null = null

  const selectedStory = computed(
    () => stories.value.find((story) => story.storyId === selectedStoryId.value) ?? null,
  )
  const currentDetail = computed(() =>
    detailStudentId.value === studentId.value &&
    detail.value?.story.storyId === selectedStoryId.value
      ? detail.value
      : null,
  )
  const currentGazeAnalysis = computed(() =>
    gazeStudentId.value === studentId.value && gazeStoryId.value === selectedStoryId.value
      ? gazeAnalysis.value
      : null,
  )
  const selectedPage = computed(
    () => currentDetail.value?.pages.find((page) => page.pageNo === currentPageNo.value) ?? null,
  )
  const selectedPageMetric = computed(() => {
    const page = selectedPage.value
    if (!page) return null
    return (
      currentGazeAnalysis.value?.pageMetrics.find(
        (metric) => metric.pageNo === page.pageNo && metric.storyLineId === page.storyLineId,
      ) ?? null
    )
  })
  const pageMetricContractError = computed(() => {
    const page = selectedPage.value
    const analysis = currentGazeAnalysis.value
    if (!page || !analysis || selectedPageMetric.value) return null
    const hasConflictingMetric = analysis.pageMetrics.some(
      (metric) => metric.pageNo === page.pageNo || metric.storyLineId === page.storyLineId,
    )
    return hasConflictingMetric
      ? '페이지 정보와 시선 분석 결과의 연결 정보가 일치하지 않습니다.'
      : null
  })
  const hasFilters = computed(() =>
    Boolean(query.from || query.to || query.storyTemplateId !== undefined),
  )

  function abortSelectionRequests(): void {
    detailSequence += 1
    gazeSequence += 1
    detailController?.abort()
    gazeController?.abort()
    detailController = null
    gazeController = null
  }

  function clearSelection(options: { clearCachedData?: boolean } = {}): void {
    abortSelectionRequests()
    selectedStoryId.value = null
    currentPageNo.value = 1
    detailStatus.value = 'idle'
    gazeStatus.value = 'idle'
    detailError.value = null
    gazeError.value = null
    detailUiError.value = null
    gazeUiError.value = null
    if (options.clearCachedData) {
      detail.value = null
      detailStudentId.value = null
      gazeAnalysis.value = null
      gazeStudentId.value = null
      gazeStoryId.value = null
    }
  }

  function clearStudentData(): void {
    clearSelection({ clearCachedData: true })
    stories.value = []
    storyTemplates.value = []
    totalElements.value = 0
    totalPages.value = 0
    listError.value = null
    listUiError.value = null
  }

  function setRepository(nextRepository: StoryRepository): void {
    repository.value = nextRepository
    reset()
  }

  function setFilters(filters: Pick<StoryHistoryQuery, 'from' | 'to' | 'storyTemplateId'>): void {
    query.from = filters.from?.trim() || undefined
    query.to = filters.to?.trim() || undefined
    query.storyTemplateId = filters.storyTemplateId
    query.page = 0
    clearSelection()
  }

  function setPage(page: number): void {
    query.page = page
    clearSelection()
  }

  function selectStory(storyId: number | null): void {
    const nextStoryId =
      storyId !== null && stories.value.some((story) => story.storyId === storyId) ? storyId : null
    if (selectedStoryId.value === nextStoryId) return
    abortSelectionRequests()
    selectedStoryId.value = nextStoryId
    currentPageNo.value = 1
    detailStatus.value = nextStoryId === null ? 'idle' : 'loading'
    gazeStatus.value = 'idle'
    detailError.value = null
    gazeError.value = null
    detailUiError.value = null
    gazeUiError.value = null
  }

  async function loadList(nextStudentId: number): Promise<void> {
    assertPositiveId(nextStudentId, 'studentId')

    const studentChanged = studentId.value !== nextStudentId
    if (studentChanged) {
      clearStudentData()
      query.page = 0
      studentId.value = nextStudentId
    }

    const requestSequence = ++listSequence
    listController?.abort()
    const controller = new AbortController()
    listController = controller
    listStatus.value = 'loading'
    listError.value = null
    listUiError.value = null

    try {
      const result = await repository.value.listHistory(
        nextStudentId,
        { ...query },
        { signal: controller.signal },
      )
      if (requestSequence !== listSequence || studentId.value !== nextStudentId) return

      storyTemplates.value = result.storyTemplates
      stories.value = result.stories
      query.page = result.page
      query.size = result.size
      totalElements.value = result.totalElements
      totalPages.value = result.totalPages
      if (!stories.value.some((story) => story.storyId === selectedStoryId.value)) {
        clearSelection()
      }
      listStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || requestSequence !== listSequence) return
      listStatus.value = 'error'
      listUiError.value = mapCommonError(error)
      listError.value = defaultErrorMessage(error, 'list')
    } finally {
      if (requestSequence === listSequence) listController = null
    }
  }

  async function loadDetail(nextStudentId: number, nextStoryId: number): Promise<void> {
    assertPositiveId(nextStudentId, 'studentId')
    assertPositiveId(nextStoryId, 'storyId')
    const requestSequence = ++detailSequence
    detailController?.abort()
    const controller = new AbortController()
    detailController = controller
    detailStatus.value = 'loading'
    detailError.value = null
    detailUiError.value = null

    try {
      const result = await repository.value.getDetail(nextStudentId, nextStoryId, {
        signal: controller.signal,
      })
      if (
        requestSequence !== detailSequence ||
        studentId.value !== nextStudentId ||
        selectedStoryId.value !== nextStoryId
      ) {
        return
      }
      detail.value = result
      detailStudentId.value = nextStudentId
      if (!result.pages.some((page) => page.pageNo === currentPageNo.value)) {
        currentPageNo.value = result.pages[0]?.pageNo ?? 1
      }
      detailStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || requestSequence !== detailSequence) return
      if (
        isApiError(error) &&
        error.status === 404 &&
        studentId.value === nextStudentId &&
        selectedStoryId.value === nextStoryId
      ) {
        clearSelection()
        await loadList(nextStudentId)
        return
      }
      detailStatus.value = 'error'
      detailUiError.value = mapCommonError(error)
      detailError.value = defaultErrorMessage(error, 'detail')
    } finally {
      if (requestSequence === detailSequence) detailController = null
    }
  }

  function markGazeNotRequested(): void {
    gazeSequence += 1
    gazeController?.abort()
    gazeController = null
    gazeAnalysis.value = null
    gazeStudentId.value = studentId.value
    gazeStoryId.value = selectedStoryId.value
    gazeStatus.value = 'success'
    gazeError.value = null
    gazeUiError.value = null
  }

  async function loadGazeAnalysis(
    nextStudentId: number,
    nextStoryId: number,
    refreshOnNotFound = true,
  ): Promise<void> {
    assertPositiveId(nextStudentId, 'studentId')
    assertPositiveId(nextStoryId, 'storyId')
    const requestSequence = ++gazeSequence
    gazeController?.abort()
    const controller = new AbortController()
    gazeController = controller
    gazeStatus.value = 'loading'
    gazeError.value = null
    gazeUiError.value = null

    try {
      const result = await repository.value.getGazeAnalysis(nextStudentId, nextStoryId, {
        signal: controller.signal,
      })
      if (
        requestSequence !== gazeSequence ||
        studentId.value !== nextStudentId ||
        selectedStoryId.value !== nextStoryId
      ) {
        return
      }
      gazeAnalysis.value = result
      gazeStudentId.value = nextStudentId
      gazeStoryId.value = nextStoryId
      gazeStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || requestSequence !== gazeSequence) return
      if (
        refreshOnNotFound &&
        isApiError(error) &&
        error.status === 404 &&
        studentId.value === nextStudentId &&
        selectedStoryId.value === nextStoryId
      ) {
        await loadList(nextStudentId)
        if (selectedStoryId.value === nextStoryId) {
          gazeAnalysis.value = null
          gazeStudentId.value = nextStudentId
          gazeStoryId.value = nextStoryId
          gazeStatus.value = 'success'
        }
        return
      }
      gazeStatus.value = 'error'
      gazeUiError.value = mapCommonError(error)
      gazeError.value = defaultErrorMessage(error, 'gaze')
    } finally {
      if (requestSequence === gazeSequence) gazeController = null
    }
  }

  async function loadSelectedStory(nextStudentId: number, nextStoryId: number): Promise<void> {
    assertPositiveId(nextStudentId, 'studentId')
    assertPositiveId(nextStoryId, 'storyId')
    const story = stories.value.find((item) => item.storyId === nextStoryId)
    if (!story || studentId.value !== nextStudentId) return

    const detailRequest = loadDetail(nextStudentId, nextStoryId)
    const gazeRequest =
      story.gazeAnalysisStatus === 'AVAILABLE'
        ? loadGazeAnalysis(nextStudentId, nextStoryId)
        : Promise.resolve(markGazeNotRequested())
    await Promise.allSettled([detailRequest, gazeRequest])
  }

  async function selectAndLoad(nextStudentId: number, nextStoryId: number): Promise<void> {
    selectStory(nextStoryId)
    if (selectedStoryId.value !== nextStoryId) return
    await loadSelectedStory(nextStudentId, nextStoryId)
  }

  function setCurrentPage(pageNo: number): void {
    if (!Number.isInteger(pageNo)) return
    const pageExists = currentDetail.value?.pages.some((page) => page.pageNo === pageNo)
    if (!pageExists) return
    currentPageNo.value = pageNo
  }

  function goToPreviousPage(): void {
    setCurrentPage(currentPageNo.value - 1)
  }

  function goToNextPage(): void {
    setCurrentPage(currentPageNo.value + 1)
  }

  function reset(): void {
    listSequence += 1
    listController?.abort()
    listController = null
    studentId.value = null
    query.from = undefined
    query.to = undefined
    query.storyTemplateId = undefined
    query.page = 0
    query.size = DEFAULT_STORY_HISTORY_PAGE_SIZE
    clearStudentData()
    listStatus.value = 'idle'
  }

  return {
    query,
    storyTemplates,
    stories,
    totalElements,
    totalPages,
    selectedStoryId,
    selectedStory,
    currentPageNo,
    currentDetail,
    currentGazeAnalysis,
    selectedPage,
    selectedPageMetric,
    pageMetricContractError,
    listStatus,
    detailStatus,
    gazeStatus,
    listError,
    detailError,
    gazeError,
    listUiError,
    detailUiError,
    gazeUiError,
    hasFilters,
    setRepository,
    setFilters,
    setPage,
    setCurrentPage,
    goToPreviousPage,
    goToNextPage,
    selectStory,
    selectAndLoad,
    loadList,
    loadDetail,
    loadGazeAnalysis,
    loadSelectedStory,
    reset,
  }
})
