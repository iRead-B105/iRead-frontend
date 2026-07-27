import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  trainingRepository,
  type CurriculumDraftItem,
  type DailyCurriculum,
  type ExpectedWord,
  type TrainingCatalogItem,
  type TrainingDetail,
  type TrainingRepository,
  type TrainingRequestStatus,
} from '@/features/teacher/training'

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function draftFromCurriculum(curriculum: DailyCurriculum | null): CurriculumDraftItem[] {
  return (
    curriculum?.trainings.map((training) => ({
      key: `training-${training.trainingId}`,
      trainingTemplateId: training.trainingTemplateId,
      trainingId: training.trainingId,
    })) ?? []
  )
}

export const useTrainingStore = defineStore('training', () => {
  const repository = shallowRef<TrainingRepository>(trainingRepository)
  const currentStudentId = ref<number | null>(null)
  const catalog = ref<readonly TrainingCatalogItem[]>([])
  const savedCurriculum = ref<DailyCurriculum | null>(null)
  const draftItems = ref<readonly CurriculumDraftItem[]>([])
  const selectedTemplateId = ref<number | null>(null)
  const selectedDraftItemKey = ref<string | null>(null)
  const selectedTrainingId = ref<number | null>(null)
  const expectedWordsByTrainingId = ref<Record<number, readonly ExpectedWord[]>>({})
  const trainingDetailById = ref<Record<number, TrainingDetail>>({})

  const catalogStatus = ref<TrainingRequestStatus>('idle')
  const curriculumStatus = ref<TrainingRequestStatus>('idle')
  const expectedWordsStatus = ref<TrainingRequestStatus>('idle')
  const detailStatus = ref<TrainingRequestStatus>('idle')
  const isSavingCurriculum = ref(false)
  const isMutatingExpectedWord = ref(false)
  const catalogError = ref<string | null>(null)
  const curriculumError = ref<string | null>(null)
  const expectedWordError = ref<string | null>(null)
  const detailError = ref<string | null>(null)

  let draftKeySequence = 0
  let loadGeneration = 0
  let resourceGeneration = 0
  let loadController: AbortController | null = null
  let resourceController: AbortController | null = null

  const draftTrainingIds = computed(() =>
    draftItems.value.map((item) => item.trainingTemplateId),
  )
  const savedTrainingIds = computed(
    () => savedCurriculum.value?.trainings.map((item) => item.trainingTemplateId) ?? [],
  )
  const hasChanges = computed(
    () =>
      draftTrainingIds.value.length !== savedTrainingIds.value.length ||
      draftTrainingIds.value.some((id, index) => id !== savedTrainingIds.value[index]),
  )
  const selectedTemplate = computed(
    () =>
      catalog.value.find((item) => item.trainingTemplateId === selectedTemplateId.value) ??
      null,
  )
  const selectedDraftItem = computed(
    () => draftItems.value.find((item) => item.key === selectedDraftItemKey.value) ?? null,
  )
  const selectedTraining = computed(
    () =>
      savedCurriculum.value?.trainings.find(
        (training) => training.trainingId === selectedTrainingId.value,
      ) ?? null,
  )
  const selectedExpectedWords = computed(
    () =>
      (selectedTrainingId.value === null
        ? []
        : expectedWordsByTrainingId.value[selectedTrainingId.value]) ?? [],
  )
  const selectedTrainingDetail = computed(
    () =>
      (selectedTrainingId.value === null
        ? null
        : trainingDetailById.value[selectedTrainingId.value]) ?? null,
  )
  const canEditCurriculum = computed(
    () => savedCurriculum.value === null || savedCurriculum.value.status === 'NOT_STARTED',
  )

  function setRepository(nextRepository: TrainingRepository): void {
    repository.value = nextRepository
    reset()
  }

  function replaceDraftFromSaved(preferredTrainingId: number | null = null): void {
    draftItems.value = draftFromCurriculum(savedCurriculum.value)
    const selected =
      draftItems.value.find((item) => item.trainingId === preferredTrainingId) ??
      draftItems.value[0] ??
      null
    selectedDraftItemKey.value = selected?.key ?? null
    selectedTrainingId.value = selected?.trainingId ?? null
  }

  function clearStudentState(studentId: number): void {
    currentStudentId.value = studentId
    catalog.value = []
    savedCurriculum.value = null
    draftItems.value = []
    selectedTemplateId.value = null
    selectedDraftItemKey.value = null
    selectedTrainingId.value = null
    expectedWordsByTrainingId.value = {}
    trainingDetailById.value = {}
    catalogStatus.value = 'loading'
    curriculumStatus.value = 'loading'
    expectedWordsStatus.value = 'idle'
    detailStatus.value = 'idle'
    isSavingCurriculum.value = false
    isMutatingExpectedWord.value = false
    catalogError.value = null
    curriculumError.value = null
    expectedWordError.value = null
    detailError.value = null
  }

  async function loadForStudent(studentId: number): Promise<void> {
    loadController?.abort()
    resourceController?.abort()
    const controller = new AbortController()
    loadController = controller
    const generation = ++loadGeneration
    resourceGeneration += 1
    clearStudentState(studentId)

    const catalogRequest = repository.value
      .getCatalog(studentId, { signal: controller.signal })
      .then((items) => {
        if (generation !== loadGeneration) return
        catalog.value = [...items].sort((left, right) => left.sequence - right.sequence)
        selectedTemplateId.value = catalog.value[0]?.trainingTemplateId ?? null
        catalogStatus.value = 'success'
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || generation !== loadGeneration) return
        catalogStatus.value = 'error'
        catalogError.value = errorMessage(error, '전체 훈련 목록을 불러오지 못했습니다.')
      })

    const curriculumRequest = repository.value
      .getCurrentCurriculum(studentId, { signal: controller.signal })
      .then((curriculum) => {
        if (generation !== loadGeneration) return
        savedCurriculum.value = curriculum
        replaceDraftFromSaved()
        curriculumStatus.value = 'success'
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || generation !== loadGeneration) return
        curriculumStatus.value = 'error'
        curriculumError.value = errorMessage(
          error,
          '다음 회차 커리큘럼을 불러오지 못했습니다.',
        )
      })

    await Promise.all([catalogRequest, curriculumRequest])
    if (generation === loadGeneration) loadController = null
    if (selectedTrainingId.value !== null) {
      await loadSelectedTrainingResources(studentId, selectedTrainingId.value)
    }
  }

  function selectTemplate(trainingTemplateId: number): void {
    if (!catalog.value.some((item) => item.trainingTemplateId === trainingTemplateId)) return
    selectedTemplateId.value = trainingTemplateId
  }

  function addSelectedTemplate(): void {
    if (
      selectedTemplateId.value === null ||
      !canEditCurriculum.value ||
      isSavingCurriculum.value
    ) {
      return
    }
    const item: CurriculumDraftItem = {
      key: `draft-${++draftKeySequence}`,
      trainingTemplateId: selectedTemplateId.value,
      trainingId: null,
    }
    draftItems.value = [...draftItems.value, item]
    selectedDraftItemKey.value = item.key
    selectedTrainingId.value = null
  }

  function removeDraftItem(key: string): void {
    if (!canEditCurriculum.value || isSavingCurriculum.value) return
    const index = draftItems.value.findIndex((item) => item.key === key)
    if (index < 0) return
    const removed = draftItems.value[index]
    draftItems.value = draftItems.value.filter((item) => item.key !== key)
    if (removed?.trainingId !== null && removed?.trainingId !== undefined) {
      const { [removed.trainingId]: _removedWords, ...remainingWords } =
        expectedWordsByTrainingId.value
      expectedWordsByTrainingId.value = remainingWords
      const { [removed.trainingId]: _removedDetail, ...remainingDetails } =
        trainingDetailById.value
      trainingDetailById.value = remainingDetails
    }
    const next = draftItems.value[Math.min(index, draftItems.value.length - 1)] ?? null
    selectedDraftItemKey.value = next?.key ?? null
    selectedTrainingId.value = next?.trainingId ?? null
  }

  function moveDraftItem(fromKey: string, toKey: string): void {
    if (!canEditCurriculum.value || isSavingCurriculum.value || fromKey === toKey) return
    const next = [...draftItems.value]
    const from = next.findIndex((item) => item.key === fromKey)
    const to = next.findIndex((item) => item.key === toKey)
    if (from < 0 || to < 0) return
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    draftItems.value = next
  }

  function discardDraft(): void {
    replaceDraftFromSaved(selectedTrainingId.value)
  }

  async function saveCurriculum(): Promise<boolean> {
    const studentId = currentStudentId.value
    if (
      studentId === null ||
      draftTrainingIds.value.length === 0 ||
      !hasChanges.value ||
      !canEditCurriculum.value ||
      isSavingCurriculum.value
    ) {
      return false
    }

    const generation = loadGeneration
    const preferredTrainingId = selectedTrainingId.value
    isSavingCurriculum.value = true
    curriculumError.value = null
    try {
      const request = { trainingId: [...draftTrainingIds.value] }
      const curriculum =
        savedCurriculum.value === null
          ? await repository.value.createCurriculum(studentId, request)
          : await repository.value.updateCurriculum(
              studentId,
              savedCurriculum.value.curriculumId,
              request,
            )
      if (generation !== loadGeneration || currentStudentId.value !== studentId) return false
      savedCurriculum.value = curriculum
      replaceDraftFromSaved(preferredTrainingId)
      curriculumStatus.value = 'success'
      return true
    } catch (error) {
      if (generation !== loadGeneration || currentStudentId.value !== studentId) return false
      curriculumError.value = errorMessage(error, '커리큘럼을 저장하지 못했습니다.')
      return false
    } finally {
      if (generation === loadGeneration) isSavingCurriculum.value = false
    }
  }

  async function selectDraftItem(studentId: number, key: string): Promise<void> {
    if (studentId !== currentStudentId.value) return
    const item = draftItems.value.find((candidate) => candidate.key === key)
    if (!item) return
    selectedDraftItemKey.value = key
    selectedTrainingId.value = item.trainingId
    if (item.trainingId === null) {
      resourceController?.abort()
      resourceGeneration += 1
      expectedWordsStatus.value = 'idle'
      detailStatus.value = 'idle'
      expectedWordError.value = null
      detailError.value = null
      return
    }
    await loadSelectedTrainingResources(studentId, item.trainingId)
  }

  async function loadSelectedTrainingResources(
    studentId: number,
    trainingId: number,
  ): Promise<void> {
    resourceController?.abort()
    const controller = new AbortController()
    resourceController = controller
    const generation = ++resourceGeneration
    expectedWordsStatus.value = 'loading'
    detailStatus.value = 'loading'
    expectedWordError.value = null
    detailError.value = null

    const expectedWordsRequest = repository.value
      .getExpectedWords(studentId, trainingId, { signal: controller.signal })
      .then((words) => {
        if (generation !== resourceGeneration || selectedTrainingId.value !== trainingId) return
        expectedWordsByTrainingId.value = {
          ...expectedWordsByTrainingId.value,
          [trainingId]: [...words],
        }
        expectedWordsStatus.value = 'success'
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || generation !== resourceGeneration) return
        expectedWordsStatus.value = 'error'
        expectedWordError.value = errorMessage(error, '예상 단어를 불러오지 못했습니다.')
      })

    const detailRequest = repository.value
      .getTrainingDetail(studentId, trainingId, { signal: controller.signal })
      .then((detail) => {
        if (generation !== resourceGeneration || selectedTrainingId.value !== trainingId) return
        trainingDetailById.value = {
          ...trainingDetailById.value,
          [trainingId]: detail,
        }
        detailStatus.value = 'success'
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || generation !== resourceGeneration) return
        detailStatus.value = 'error'
        detailError.value = errorMessage(error, '훈련 미리보기를 불러오지 못했습니다.')
      })

    await Promise.all([expectedWordsRequest, detailRequest])
    if (generation === resourceGeneration) resourceController = null
  }

  async function addExpectedWord(wordName: string): Promise<boolean> {
    const studentId = currentStudentId.value
    const trainingId = selectedTrainingId.value
    if (studentId === null || trainingId === null || isMutatingExpectedWord.value) return false
    const normalized = wordName.trim()
    if (!normalized || normalized.length > 50) {
      expectedWordError.value = '예상 단어는 1자 이상 50자 이하여야 합니다.'
      return false
    }
    if (selectedExpectedWords.value.some((word) => word.wordName === normalized)) {
      expectedWordError.value = '이미 추가된 예상 단어입니다.'
      return false
    }

    isMutatingExpectedWord.value = true
    expectedWordError.value = null
    try {
      await repository.value.addExpectedWord(studentId, trainingId, normalized)
      await loadSelectedTrainingResources(studentId, trainingId)
      return true
    } catch (error) {
      expectedWordError.value = errorMessage(error, '예상 단어를 추가하지 못했습니다.')
      return false
    } finally {
      isMutatingExpectedWord.value = false
    }
  }

  async function deleteExpectedWord(wordId: number): Promise<boolean> {
    const studentId = currentStudentId.value
    const trainingId = selectedTrainingId.value
    if (studentId === null || trainingId === null || isMutatingExpectedWord.value) return false

    isMutatingExpectedWord.value = true
    expectedWordError.value = null
    try {
      await repository.value.deleteExpectedWord(studentId, trainingId, wordId)
      await loadSelectedTrainingResources(studentId, trainingId)
      return true
    } catch (error) {
      expectedWordError.value = errorMessage(error, '예상 단어를 삭제하지 못했습니다.')
      return false
    } finally {
      isMutatingExpectedWord.value = false
    }
  }

  function reset(): void {
    loadController?.abort()
    resourceController?.abort()
    loadGeneration += 1
    resourceGeneration += 1
    currentStudentId.value = null
    catalog.value = []
    savedCurriculum.value = null
    draftItems.value = []
    selectedTemplateId.value = null
    selectedDraftItemKey.value = null
    selectedTrainingId.value = null
    expectedWordsByTrainingId.value = {}
    trainingDetailById.value = {}
    catalogStatus.value = 'idle'
    curriculumStatus.value = 'idle'
    expectedWordsStatus.value = 'idle'
    detailStatus.value = 'idle'
    isSavingCurriculum.value = false
    isMutatingExpectedWord.value = false
    catalogError.value = null
    curriculumError.value = null
    expectedWordError.value = null
    detailError.value = null
  }

  return {
    currentStudentId,
    catalog,
    savedCurriculum,
    draftItems,
    draftTrainingIds,
    selectedTemplateId,
    selectedDraftItemKey,
    selectedTrainingId,
    selectedTemplate,
    selectedDraftItem,
    selectedTraining,
    selectedExpectedWords,
    selectedTrainingDetail,
    expectedWordsByTrainingId,
    trainingDetailById,
    catalogStatus,
    curriculumStatus,
    expectedWordsStatus,
    detailStatus,
    isSavingCurriculum,
    isMutatingExpectedWord,
    catalogError,
    curriculumError,
    expectedWordError,
    detailError,
    hasChanges,
    canEditCurriculum,
    setRepository,
    loadForStudent,
    selectTemplate,
    addSelectedTemplate,
    removeDraftItem,
    moveDraftItem,
    discardDraft,
    saveCurriculum,
    selectDraftItem,
    loadSelectedTrainingResources,
    addExpectedWord,
    deleteExpectedWord,
    reset,
  }
})
