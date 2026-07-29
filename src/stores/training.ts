import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { mapCommonError, type UiError } from '@/features/teacher/error'
import { isAbortError, isApiError } from '@/lib/api'
import type { GazeAnalysisRequestStatus, GazeAnalysisState } from '@/features/teacher/gaze'
import {
  trainingRepository,
  CURRICULUM_TRAINING_COUNT,
  CurriculumSynchronizationError,
  type CurriculumLog,
  type CurriculumDraftItem,
  type CurriculumTrainingLog,
  type DailyCurriculum,
  type ExpectedWord,
  type TrainingCatalogItem,
  type TrainingDetail,
  type TrainingDownload,
  type TrainingExportFormat,
  type TrainingPeriod,
  type TrainingRepository,
  type TrainingRequestStatus,
  type TrainingStatistics,
} from '@/features/teacher/training'

function errorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback
  return (
    mapCommonError(error, {
      overrides: {
        NEXT_CURRICULUM_ALREADY_EXISTS: {
          message: '이미 수정 가능한 다음 회차 커리큘럼이 있습니다.',
          retryable: false,
        },
        CURRICULUM_ALREADY_STARTED: {
          message: '시작된 커리큘럼은 수정할 수 없습니다.',
          retryable: false,
        },
        DUPLICATE_EXPECTED_WORD: {
          message: '이미 추가된 예상 단어입니다.',
          action: 'edit-input',
          retryable: false,
        },
      },
    })?.message ?? fallback
  )
}

function historyErrorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback
  if (error.status === 400) return '조회 조건이 올바르지 않습니다.'
  if (error.status === 403) return '이 학습자의 훈련 기록을 볼 권한이 없습니다.'
  if (error.status === 404) return '요청한 훈련 기록을 찾을 수 없습니다.'
  return mapCommonError(error)?.message ?? fallback
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

export type CurriculumSynchronizationStatus = 'synced' | 'refreshing' | 'required'

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
  const curriculumSynchronizationStatus = ref<CurriculumSynchronizationStatus>('refreshing')
  const isSavingCurriculum = ref(false)
  const curriculumSaveConflict = ref(false)
  const isRefreshingCurriculumConflict = ref(false)
  const isMutatingExpectedWord = ref(false)
  const catalogError = ref<string | null>(null)
  const curriculumError = ref<string | null>(null)
  const expectedWordError = ref<string | null>(null)
  const detailError = ref<string | null>(null)

  const historyStudentId = ref<number | null>(null)
  const period = ref<TrainingPeriod>('30d')
  const curriculumLogs = ref<readonly CurriculumLog[]>([])
  const selectedCurriculumId = ref<number | null>(null)
  const trainingLog = ref<CurriculumTrainingLog | null>(null)
  const statistics = ref<TrainingStatistics | null>(null)
  const selectedHistoryTrainingId = ref<number | null>(null)
  const historyTrainingDetail = ref<TrainingDetail | null>(null)
  const historyGazeAnalysis = ref<GazeAnalysisState | null>(null)
  const curriculumLogsStatus = ref<TrainingRequestStatus>('idle')
  const trainingLogStatus = ref<TrainingRequestStatus>('idle')
  const statisticsStatus = ref<TrainingRequestStatus>('idle')
  const historyDetailStatus = ref<TrainingRequestStatus>('idle')
  const historyGazeStatus = ref<GazeAnalysisRequestStatus>('idle')
  const exportingFormat = ref<TrainingExportFormat | null>(null)
  const curriculumLogsError = ref<string | null>(null)
  const curriculumLogsUiError = ref<UiError | null>(null)
  const trainingLogError = ref<string | null>(null)
  const statisticsError = ref<string | null>(null)
  const historyDetailError = ref<string | null>(null)
  const historyGazeError = ref<string | null>(null)
  const exportError = ref<string | null>(null)

  let draftKeySequence = 0
  let loadGeneration = 0
  let resourceGeneration = 0
  let loadController: AbortController | null = null
  let synchronizationController: AbortController | null = null
  let resourceController: AbortController | null = null
  let historyGeneration = 0
  let historyCurriculumGeneration = 0
  let historyDetailGeneration = 0
  let historyGazeGeneration = 0
  let historyController: AbortController | null = null
  let historyCurriculumController: AbortController | null = null
  let historyDetailController: AbortController | null = null
  let historyGazeController: AbortController | null = null

  const draftTrainingIds = computed(() => draftItems.value.map((item) => item.trainingTemplateId))
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
      catalog.value.find((item) => item.trainingTemplateId === selectedTemplateId.value) ?? null,
  )
  const selectedDraftItem = computed(
    () => draftItems.value.find((item) => item.key === selectedDraftItemKey.value) ?? null,
  )
  const selectedTraining = computed(() => {
    const training =
      savedCurriculum.value?.trainings.find(
        (candidate) => candidate.trainingId === selectedTrainingId.value,
      ) ?? null
    if (!training) return null
    const detail = trainingDetailById.value[training.trainingId]
    return detail ? { ...training, status: detail.status } : training
  })
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
    () =>
      curriculumSynchronizationStatus.value === 'synced' &&
      !curriculumSaveConflict.value &&
      (savedCurriculum.value === null || savedCurriculum.value.status === 'NOT_STARTED'),
  )
  const canEditExpectedWords = computed(
    () =>
      curriculumSynchronizationStatus.value === 'synced' &&
      (selectedTraining.value?.status === 'NOT_READY' ||
        selectedTraining.value?.status === 'NOT_STARTED'),
  )
  const selectedCurriculumLog = computed(
    () =>
      curriculumLogs.value.find(
        (curriculum) => curriculum.curriculumId === selectedCurriculumId.value,
      ) ?? null,
  )
  const selectedHistoryTraining = computed(
    () =>
      trainingLog.value?.trainings.find(
        (training) => training.trainingId === selectedHistoryTrainingId.value,
      ) ?? null,
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
    curriculumSynchronizationStatus.value = 'refreshing'
    isSavingCurriculum.value = false
    curriculumSaveConflict.value = false
    isRefreshingCurriculumConflict.value = false
    isMutatingExpectedWord.value = false
    catalogError.value = null
    curriculumError.value = null
    expectedWordError.value = null
    detailError.value = null
  }

  async function loadForStudent(studentId: number): Promise<void> {
    loadController?.abort()
    synchronizationController?.abort()
    synchronizationController = null
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
        catalog.value = [...items]
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
        curriculumSynchronizationStatus.value = 'synced'
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || generation !== loadGeneration) return
        curriculumStatus.value = 'error'
        curriculumSynchronizationStatus.value = 'required'
        curriculumError.value = errorMessage(error, '다음 회차 커리큘럼을 불러오지 못했습니다.')
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
    if (selectedTemplateId.value === null || !canEditCurriculum.value || isSavingCurriculum.value) {
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
      const { [removed.trainingId]: _removedDetail, ...remainingDetails } = trainingDetailById.value
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

  function clearSelectedTrainingResources(): void {
    resourceController?.abort()
    resourceController = null
    resourceGeneration += 1
    selectedDraftItemKey.value = null
    selectedTrainingId.value = null
    expectedWordsByTrainingId.value = {}
    trainingDetailById.value = {}
    expectedWordsStatus.value = 'idle'
    detailStatus.value = 'idle'
    isMutatingExpectedWord.value = false
    expectedWordError.value = null
    detailError.value = null
  }

  function requireCurriculumSynchronization(): void {
    curriculumSynchronizationStatus.value = 'required'
    clearSelectedTrainingResources()
  }

  async function saveCurriculum(): Promise<boolean> {
    const studentId = currentStudentId.value
    if (
      studentId === null ||
      draftTrainingIds.value.length !== CURRICULUM_TRAINING_COUNT ||
      !hasChanges.value ||
      !canEditCurriculum.value ||
      isSavingCurriculum.value
    ) {
      return false
    }

    const generation = loadGeneration
    const preferredTrainingId = selectedTrainingId.value
    isSavingCurriculum.value = true
    curriculumSaveConflict.value = false
    curriculumError.value = null
    try {
      const request = { trainingTemplateIds: [...draftTrainingIds.value] }
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
      curriculumSynchronizationStatus.value = 'synced'
      curriculumSaveConflict.value = false
      return true
    } catch (error) {
      if (generation !== loadGeneration || currentStudentId.value !== studentId) return false
      if (error instanceof CurriculumSynchronizationError) {
        requireCurriculumSynchronization()
        curriculumError.value =
          '커리큘럼은 저장됐지만 최신 내용을 불러오지 못했습니다. 최신 내용을 다시 불러와 주세요.'
      } else if (isApiError(error) && error.status === 409) {
        curriculumSaveConflict.value = true
        curriculumError.value =
          '실제 훈련이 시작되지 않았더라도 자료가 준비된 훈련이 포함되어 있으면 현재 백엔드에서는 저장할 수 없습니다. 서버의 최신 내용을 다시 불러와 주세요.'
      } else {
        curriculumError.value = errorMessage(error, '커리큘럼을 저장하지 못했습니다.')
      }
      return false
    } finally {
      if (generation === loadGeneration) isSavingCurriculum.value = false
    }
  }

  async function refreshCurriculumAfterConflict(): Promise<boolean> {
    const studentId = currentStudentId.value
    if (
      studentId === null ||
      !curriculumSaveConflict.value ||
      isSavingCurriculum.value ||
      isRefreshingCurriculumConflict.value
    ) {
      return false
    }

    synchronizationController?.abort()
    const controller = new AbortController()
    synchronizationController = controller
    const generation = loadGeneration
    isRefreshingCurriculumConflict.value = true
    curriculumError.value = null
    try {
      const curriculum = await repository.value.getCurrentCurriculum(studentId, {
        signal: controller.signal,
      })
      if (generation !== loadGeneration || currentStudentId.value !== studentId) return false
      if (curriculum === null) {
        throw new Error('저장된 현재 커리큘럼을 찾을 수 없습니다.')
      }
      clearSelectedTrainingResources()
      savedCurriculum.value = curriculum
      replaceDraftFromSaved()
      curriculumStatus.value = 'success'
      curriculumSynchronizationStatus.value = 'synced'
      curriculumSaveConflict.value = false
      return true
    } catch (error) {
      if (
        isAbortError(error) ||
        generation !== loadGeneration ||
        currentStudentId.value !== studentId
      ) {
        return false
      }
      curriculumSaveConflict.value = true
      curriculumError.value =
        '서버의 최신 커리큘럼을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
      return false
    } finally {
      if (synchronizationController === controller) synchronizationController = null
      if (generation === loadGeneration) isRefreshingCurriculumConflict.value = false
    }
  }

  async function retryCurriculumSynchronization(): Promise<boolean> {
    const studentId = currentStudentId.value
    if (
      studentId === null ||
      curriculumSynchronizationStatus.value !== 'required' ||
      isSavingCurriculum.value
    ) {
      return false
    }

    synchronizationController?.abort()
    const controller = new AbortController()
    synchronizationController = controller
    const generation = loadGeneration
    curriculumSynchronizationStatus.value = 'refreshing'
    curriculumError.value = null
    try {
      const curriculum = await repository.value.getCurrentCurriculum(studentId, {
        signal: controller.signal,
      })
      if (generation !== loadGeneration || currentStudentId.value !== studentId) return false
      if (curriculum === null) {
        throw new Error('저장된 현재 커리큘럼을 찾을 수 없습니다.')
      }
      savedCurriculum.value = curriculum
      replaceDraftFromSaved()
      clearSelectedTrainingResources()
      curriculumStatus.value = 'success'
      curriculumSynchronizationStatus.value = 'synced'
      return true
    } catch (error) {
      if (
        isAbortError(error) ||
        generation !== loadGeneration ||
        currentStudentId.value !== studentId
      ) {
        return false
      }
      requireCurriculumSynchronization()
      curriculumError.value =
        '저장은 완료됐지만 최신 커리큘럼을 불러오지 못했습니다. 다시 시도해 주세요.'
      return false
    } finally {
      if (synchronizationController === controller) synchronizationController = null
    }
  }

  async function selectDraftItem(studentId: number, key: string): Promise<void> {
    if (
      studentId !== currentStudentId.value ||
      curriculumSynchronizationStatus.value !== 'synced'
    ) {
      return
    }
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
    if (
      studentId !== currentStudentId.value ||
      curriculumSynchronizationStatus.value !== 'synced'
    ) {
      return
    }
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
    if (
      studentId === null ||
      trainingId === null ||
      !canEditExpectedWords.value ||
      isMutatingExpectedWord.value
    ) {
      return false
    }
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
    if (
      studentId === null ||
      trainingId === null ||
      !canEditExpectedWords.value ||
      isMutatingExpectedWord.value
    ) {
      return false
    }

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

  function abortHistoryRequests(): void {
    historyController?.abort()
    historyCurriculumController?.abort()
    historyDetailController?.abort()
    historyGazeController?.abort()
    historyController = null
    historyCurriculumController = null
    historyDetailController = null
    historyGazeController = null
  }

  function clearHistoryState(studentId: number, resetPeriod: boolean): void {
    historyStudentId.value = studentId
    if (resetPeriod) period.value = '30d'
    curriculumLogs.value = []
    selectedCurriculumId.value = null
    trainingLog.value = null
    statistics.value = null
    selectedHistoryTrainingId.value = null
    historyTrainingDetail.value = null
    historyGazeAnalysis.value = null
    curriculumLogsStatus.value = 'loading'
    trainingLogStatus.value = 'idle'
    statisticsStatus.value = 'idle'
    historyDetailStatus.value = 'idle'
    historyGazeStatus.value = 'idle'
    exportingFormat.value = null
    curriculumLogsError.value = null
    curriculumLogsUiError.value = null
    trainingLogError.value = null
    statisticsError.value = null
    historyDetailError.value = null
    historyGazeError.value = null
    exportError.value = null
  }

  async function loadHistoryForStudent(studentId: number): Promise<void> {
    abortHistoryRequests()
    historyGeneration += 1
    historyCurriculumGeneration += 1
    historyDetailGeneration += 1
    historyGazeGeneration += 1
    clearHistoryState(studentId, true)
    await loadCurriculumLogs(studentId)
  }

  async function setHistoryPeriod(studentId: number, nextPeriod: TrainingPeriod): Promise<void> {
    if (studentId !== historyStudentId.value) return
    if (nextPeriod !== '30d' && nextPeriod !== '3m') return
    if (period.value === nextPeriod && curriculumLogsStatus.value !== 'error') return
    period.value = nextPeriod
    abortHistoryRequests()
    historyGeneration += 1
    historyCurriculumGeneration += 1
    historyDetailGeneration += 1
    historyGazeGeneration += 1
    clearHistoryState(studentId, false)
    await loadCurriculumLogs(studentId)
  }

  async function retryHistory(): Promise<void> {
    const studentId = historyStudentId.value
    if (studentId === null) return
    abortHistoryRequests()
    historyGeneration += 1
    historyCurriculumGeneration += 1
    historyDetailGeneration += 1
    historyGazeGeneration += 1
    curriculumLogsStatus.value = 'loading'
    curriculumLogsError.value = null
    curriculumLogsUiError.value = null
    await loadCurriculumLogs(studentId)
  }

  async function loadCurriculumLogs(studentId: number): Promise<void> {
    const controller = new AbortController()
    historyController = controller
    const generation = historyGeneration
    const requestedPeriod = period.value
    curriculumLogsStatus.value = 'loading'
    curriculumLogsError.value = null
    try {
      const logs = await repository.value.getCurriculumLogs(studentId, requestedPeriod, {
        signal: controller.signal,
      })
      if (
        generation !== historyGeneration ||
        historyStudentId.value !== studentId ||
        period.value !== requestedPeriod
      ) {
        return
      }
      curriculumLogs.value = [...logs].sort(
        (left, right) =>
          right.date.localeCompare(left.date) || right.curriculumId - left.curriculumId,
      )
      selectedCurriculumId.value = curriculumLogs.value[0]?.curriculumId ?? null
      curriculumLogsStatus.value = 'success'
      if (selectedCurriculumId.value !== null) {
        await loadHistoryCurriculum(studentId, selectedCurriculumId.value)
      } else {
        trainingLog.value = null
        statistics.value = null
        selectedHistoryTrainingId.value = null
        historyTrainingDetail.value = null
        historyGazeAnalysis.value = null
        trainingLogStatus.value = 'idle'
        statisticsStatus.value = 'idle'
        historyDetailStatus.value = 'idle'
        historyGazeStatus.value = 'idle'
      }
    } catch (error) {
      if (isAbortError(error) || generation !== historyGeneration) return
      curriculumLogsStatus.value = 'error'
      curriculumLogsUiError.value = mapCommonError(error)
      curriculumLogsError.value = historyErrorMessage(
        error,
        '완료된 커리큘럼 기록을 불러오지 못했습니다.',
      )
    } finally {
      if (generation === historyGeneration) historyController = null
    }
  }

  async function selectHistoryCurriculum(studentId: number, curriculumId: number): Promise<void> {
    if (studentId !== historyStudentId.value) return
    if (!curriculumLogs.value.some((item) => item.curriculumId === curriculumId)) return
    if (
      selectedCurriculumId.value === curriculumId &&
      trainingLogStatus.value === 'success' &&
      statisticsStatus.value === 'success'
    ) {
      return
    }
    await loadHistoryCurriculum(studentId, curriculumId)
  }

  async function loadHistoryCurriculum(studentId: number, curriculumId: number): Promise<void> {
    historyCurriculumController?.abort()
    historyDetailController?.abort()
    historyGazeController?.abort()
    const controller = new AbortController()
    historyCurriculumController = controller
    const generation = ++historyCurriculumGeneration
    historyDetailGeneration += 1
    historyGazeGeneration += 1
    selectedCurriculumId.value = curriculumId
    trainingLog.value = null
    statistics.value = null
    selectedHistoryTrainingId.value = null
    historyTrainingDetail.value = null
    historyGazeAnalysis.value = null
    trainingLogStatus.value = 'loading'
    statisticsStatus.value = 'loading'
    historyDetailStatus.value = 'idle'
    historyGazeStatus.value = 'idle'
    trainingLogError.value = null
    statisticsError.value = null
    historyDetailError.value = null
    historyGazeError.value = null
    exportError.value = null

    const logRequest = repository.value
      .getTrainingLog(studentId, curriculumId, { signal: controller.signal })
      .then((log) => {
        if (
          generation !== historyCurriculumGeneration ||
          selectedCurriculumId.value !== curriculumId
        ) {
          return
        }
        trainingLog.value = log
        const currentStillExists = log.trainings.some(
          (training) => training.trainingId === selectedHistoryTrainingId.value,
        )
        if (!currentStillExists) {
          selectedHistoryTrainingId.value = log.trainings[0]?.trainingId ?? null
        }
        trainingLogStatus.value = 'success'
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || generation !== historyCurriculumGeneration) return
        trainingLogStatus.value = 'error'
        trainingLogError.value = historyErrorMessage(
          error,
          '선택한 커리큘럼의 훈련 이력을 불러오지 못했습니다.',
        )
      })

    const statisticsRequest = repository.value
      .getStatistics(studentId, curriculumId, period.value, {
        signal: controller.signal,
      })
      .then((nextStatistics) => {
        if (
          generation !== historyCurriculumGeneration ||
          selectedCurriculumId.value !== curriculumId
        ) {
          return
        }
        statistics.value = nextStatistics
        statisticsStatus.value = 'success'
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || generation !== historyCurriculumGeneration) return
        statisticsStatus.value = 'error'
        statisticsError.value = historyErrorMessage(error, '훈련 통계를 불러오지 못했습니다.')
      })

    await Promise.all([logRequest, statisticsRequest])
    if (generation !== historyCurriculumGeneration) return
    historyCurriculumController = null
    if (selectedHistoryTrainingId.value !== null) {
      await Promise.all([
        loadHistoryTrainingDetail(studentId, selectedHistoryTrainingId.value),
        loadHistoryTrainingGaze(studentId, selectedHistoryTrainingId.value),
      ])
    }
  }

  async function selectHistoryTraining(studentId: number, trainingId: number): Promise<void> {
    if (studentId !== historyStudentId.value) return
    if (!trainingLog.value?.trainings.some((item) => item.trainingId === trainingId)) return
    selectedHistoryTrainingId.value = trainingId
    await Promise.all([
      loadHistoryTrainingDetail(studentId, trainingId),
      loadHistoryTrainingGaze(studentId, trainingId),
    ])
  }

  async function loadHistoryTrainingDetail(studentId: number, trainingId: number): Promise<void> {
    historyDetailController?.abort()
    const controller = new AbortController()
    historyDetailController = controller
    const generation = ++historyDetailGeneration
    historyTrainingDetail.value = null
    historyDetailStatus.value = 'loading'
    historyDetailError.value = null
    exportError.value = null
    try {
      const detail = await repository.value.getTrainingDetail(studentId, trainingId, {
        signal: controller.signal,
      })
      if (
        generation !== historyDetailGeneration ||
        selectedHistoryTrainingId.value !== trainingId
      ) {
        return
      }
      historyTrainingDetail.value = detail
      historyDetailStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || generation !== historyDetailGeneration) return
      historyDetailStatus.value = 'error'
      historyDetailError.value = historyErrorMessage(
        error,
        '선택한 훈련 상세를 불러오지 못했습니다.',
      )
    } finally {
      if (generation === historyDetailGeneration) historyDetailController = null
    }
  }

  async function loadHistoryTrainingGaze(studentId: number, trainingId: number): Promise<void> {
    if (studentId !== historyStudentId.value || selectedHistoryTrainingId.value !== trainingId) {
      return
    }
    historyGazeController?.abort()
    const controller = new AbortController()
    historyGazeController = controller
    const generation = ++historyGazeGeneration
    historyGazeAnalysis.value = null
    historyGazeStatus.value = 'loading'
    historyGazeError.value = null
    try {
      const state = await repository.value.getGazeAnalysis(studentId, trainingId, {
        signal: controller.signal,
      })
      if (
        generation !== historyGazeGeneration ||
        historyStudentId.value !== studentId ||
        selectedHistoryTrainingId.value !== trainingId
      ) {
        return
      }
      historyGazeAnalysis.value = state
      historyGazeStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || generation !== historyGazeGeneration) return
      historyGazeStatus.value = 'error'
      historyGazeError.value = historyErrorMessage(error, '시선 분석 결과를 불러오지 못했습니다.')
    } finally {
      if (generation === historyGazeGeneration) historyGazeController = null
    }
  }

  async function retryHistoryGaze(): Promise<void> {
    const studentId = historyStudentId.value
    const trainingId = selectedHistoryTrainingId.value
    if (studentId === null || trainingId === null) return
    await loadHistoryTrainingGaze(studentId, trainingId)
  }

  async function exportSelectedTraining(
    studentId: number,
    format: TrainingExportFormat,
  ): Promise<TrainingDownload | null> {
    const trainingId = selectedHistoryTrainingId.value
    if (
      studentId !== historyStudentId.value ||
      trainingId === null ||
      exportingFormat.value !== null
    ) {
      return null
    }
    exportingFormat.value = format
    exportError.value = null
    try {
      return await repository.value.exportTraining(studentId, trainingId, format)
    } catch (error) {
      exportError.value = historyErrorMessage(error, `${format} 파일을 내려받지 못했습니다.`)
      return null
    } finally {
      exportingFormat.value = null
    }
  }

  function reset(): void {
    loadController?.abort()
    synchronizationController?.abort()
    resourceController?.abort()
    abortHistoryRequests()
    loadGeneration += 1
    resourceGeneration += 1
    historyGeneration += 1
    historyCurriculumGeneration += 1
    historyDetailGeneration += 1
    historyGazeGeneration += 1
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
    curriculumSynchronizationStatus.value = 'refreshing'
    isSavingCurriculum.value = false
    curriculumSaveConflict.value = false
    isRefreshingCurriculumConflict.value = false
    isMutatingExpectedWord.value = false
    catalogError.value = null
    curriculumError.value = null
    expectedWordError.value = null
    detailError.value = null
    historyStudentId.value = null
    period.value = '30d'
    curriculumLogs.value = []
    selectedCurriculumId.value = null
    trainingLog.value = null
    statistics.value = null
    selectedHistoryTrainingId.value = null
    historyTrainingDetail.value = null
    historyGazeAnalysis.value = null
    curriculumLogsStatus.value = 'idle'
    trainingLogStatus.value = 'idle'
    statisticsStatus.value = 'idle'
    historyDetailStatus.value = 'idle'
    historyGazeStatus.value = 'idle'
    exportingFormat.value = null
    curriculumLogsError.value = null
    trainingLogError.value = null
    statisticsError.value = null
    historyDetailError.value = null
    historyGazeError.value = null
    exportError.value = null
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
    curriculumSynchronizationStatus,
    isSavingCurriculum,
    curriculumSaveConflict,
    isRefreshingCurriculumConflict,
    isMutatingExpectedWord,
    catalogError,
    curriculumError,
    expectedWordError,
    detailError,
    hasChanges,
    canEditCurriculum,
    canEditExpectedWords,
    historyStudentId,
    period,
    curriculumLogs,
    selectedCurriculumId,
    selectedCurriculumLog,
    trainingLog,
    statistics,
    selectedHistoryTrainingId,
    selectedHistoryTraining,
    historyTrainingDetail,
    historyGazeAnalysis,
    curriculumLogsStatus,
    trainingLogStatus,
    statisticsStatus,
    historyDetailStatus,
    historyGazeStatus,
    exportingFormat,
    curriculumLogsError,
    curriculumLogsUiError,
    trainingLogError,
    statisticsError,
    historyDetailError,
    historyGazeError,
    exportError,
    setRepository,
    loadForStudent,
    selectTemplate,
    addSelectedTemplate,
    removeDraftItem,
    moveDraftItem,
    discardDraft,
    saveCurriculum,
    refreshCurriculumAfterConflict,
    retryCurriculumSynchronization,
    selectDraftItem,
    loadSelectedTrainingResources,
    addExpectedWord,
    deleteExpectedWord,
    loadHistoryForStudent,
    setHistoryPeriod,
    retryHistory,
    selectHistoryCurriculum,
    selectHistoryTraining,
    loadHistoryTrainingDetail,
    loadHistoryTrainingGaze,
    retryHistoryGaze,
    exportSelectedTraining,
    reset,
  }
})
