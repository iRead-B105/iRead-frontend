import { computed, reactive, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_STORY_HISTORY_PAGE_SIZE,
  storyRepository,
  type StoryHistoryItem,
  type StoryHistoryQuery,
  type StoryRepository,
  type StoryRequestStatus,
  type StoryTemplateOption,
} from '@/features/teacher/story'
import { mapCommonError, type UiError } from '@/features/teacher/error'
import { isAbortError, isApiError } from '@/lib/api'

function defaultErrorMessage(error: unknown): string {
  if (!isApiError(error)) return '이야기 이력을 불러오지 못했습니다.'
  return mapCommonError(error)?.message ?? '이야기 이력을 불러오지 못했습니다.'
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
  const listStatus = ref<StoryRequestStatus>('idle')
  const listError = ref<string | null>(null)
  const listUiError = ref<UiError | null>(null)

  let listSequence = 0
  let listController: AbortController | null = null

  const selectedStory = computed(
    () => stories.value.find((story) => story.storyId === selectedStoryId.value) ?? null,
  )
  const hasFilters = computed(
    () => Boolean(query.from || query.to || query.storyTemplateId !== undefined),
  )

  function clearStudentData(): void {
    stories.value = []
    storyTemplates.value = []
    totalElements.value = 0
    totalPages.value = 0
    selectedStoryId.value = null
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
    selectedStoryId.value = null
  }

  function setPage(page: number): void {
    query.page = page
    selectedStoryId.value = null
  }

  function selectStory(storyId: number | null): void {
    selectedStoryId.value =
      storyId !== null && stories.value.some((story) => story.storyId === storyId)
        ? storyId
        : null
  }

  async function loadList(nextStudentId: number): Promise<void> {
    if (!Number.isInteger(nextStudentId) || nextStudentId <= 0) {
      throw new TypeError('[이야기 이력] studentId는 양의 정수여야 합니다.')
    }

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
        selectedStoryId.value = null
      }
      listStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || requestSequence !== listSequence) return
      listStatus.value = 'error'
      listUiError.value = mapCommonError(error)
      listError.value = listUiError.value?.message ?? defaultErrorMessage(error)
    } finally {
      if (requestSequence === listSequence) listController = null
    }
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
    listStatus,
    listError,
    listUiError,
    hasFilters,
    setRepository,
    setFilters,
    setPage,
    selectStory,
    loadList,
    reset,
  }
})
