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
  type LessonMaterialDocument,
  type LessonMaterialFieldError,
  type LessonMaterialSaveIssue,
  type SaveLessonMaterialRequest,
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function lessonMaterialValidationErrors(error: unknown): readonly LessonMaterialFieldError[] {
  if (!isApiError(error) || !isRecord(error.responseBody)) return []
  const errorBody = isRecord(error.responseBody.error) ? error.responseBody.error : null
  const details = errorBody && isRecord(errorBody.details) ? errorBody.details : null
  const errors = details && Array.isArray(details.errors) ? details.errors : []

  return errors.flatMap((candidate) => {
    if (!isRecord(candidate)) return []
    if (typeof candidate.path !== 'string' || typeof candidate.message !== 'string') return []
    return [
      {
        path: candidate.path,
        reason: typeof candidate.reason === 'string' ? candidate.reason : 'INVALID',
        message: candidate.message,
      },
    ]
  })
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
  const trainingDetailById = ref<Record<number, TrainingDetail>>({})
  const lessonMaterialByTrainingId = ref<Record<number, LessonMaterialDocument>>({})

  const catalogStatus = ref<TrainingRequestStatus>('idle')
  const curriculumStatus = ref<TrainingRequestStatus>('idle')
  const detailStatus = ref<TrainingRequestStatus>('idle')
  const lessonMaterialStatus = ref<TrainingRequestStatus>('idle')
  const lessonMaterialSaveStatus = ref<TrainingRequestStatus>('idle')
  const lessonMaterialSaveIssue = ref<LessonMaterialSaveIssue | null>(null)
  const lessonMaterialFieldErrors = ref<readonly LessonMaterialFieldError[]>([])
  const lessonMaterialRemoteChange = ref(false)
  const lessonMaterialRemoteRevision = ref<number | null>(null)
  const lessonMaterialEditingTrainingId = ref<number | null>(null)
  const lessonMaterialHasLocalChanges = ref(false)
  const materialGenerationStatus = ref<TrainingRequestStatus>('idle')
  const reviewCompletionStatus = ref<TrainingRequestStatus>('idle')
  const curriculumSynchronizationStatus = ref<CurriculumSynchronizationStatus>('refreshing')
  const isSavingCurriculum = ref(false)
  const curriculumSaveConflict = ref(false)
  const isRefreshingCurriculumConflict = ref(false)
  const isSavingLessonMaterial = ref(false)
  const catalogError = ref<string | null>(null)
  const curriculumError = ref<string | null>(null)
  const detailError = ref<string | null>(null)
  const lessonMaterialError = ref<string | null>(null)
  const lessonMaterialSaveError = ref<string | null>(null)
  const materialGenerationError = ref<string | null>(null)
  const reviewCompletionError = ref<string | null>(null)
  const requestedCurriculumId = ref<number | null>(null)

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
  let backgroundRefreshController: AbortController | null = null
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
  const selectedTrainingDetail = computed(
    () =>
      (selectedTrainingId.value === null
        ? null
        : trainingDetailById.value[selectedTrainingId.value]) ?? null,
  )
  const selectedLessonMaterial = computed(
    () =>
      (selectedTrainingId.value === null
        ? null
        : lessonMaterialByTrainingId.value[selectedTrainingId.value]) ?? null,
  )
  const canEditCurriculum = computed(
    () =>
      curriculumSynchronizationStatus.value === 'synced' &&
      !curriculumSaveConflict.value &&
      (savedCurriculum.value === null || savedCurriculum.value.status === 'NOT_STARTED'),
  )
  const canCompleteReview = computed(
    () =>
      savedCurriculum.value?.sourceTestCurriculumId != null &&
      savedCurriculum.value.reviewStatus === 'REVIEW_REQUIRED' &&
      savedCurriculum.value.status === 'NOT_STARTED' &&
      curriculumSynchronizationStatus.value === 'synced' &&
      !hasChanges.value &&
      !lessonMaterialHasLocalChanges.value &&
      !isSavingCurriculum.value &&
      !isSavingLessonMaterial.value &&
      materialGenerationStatus.value !== 'loading' &&
      reviewCompletionStatus.value !== 'loading' &&
      curriculumStatus.value === 'success',
  )
  const requiresMaterialRegeneration = computed(
    () => selectedTrainingDetail.value?.status === 'NOT_READY',
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
    trainingDetailById.value = {}
    lessonMaterialByTrainingId.value = {}
    catalogStatus.value = 'loading'
    curriculumStatus.value = 'loading'
    detailStatus.value = 'idle'
    lessonMaterialStatus.value = 'idle'
    lessonMaterialSaveStatus.value = 'idle'
    lessonMaterialSaveIssue.value = null
    lessonMaterialFieldErrors.value = []
    lessonMaterialRemoteChange.value = false
    lessonMaterialRemoteRevision.value = null
    lessonMaterialEditingTrainingId.value = null
    lessonMaterialHasLocalChanges.value = false
    materialGenerationStatus.value = 'idle'
    reviewCompletionStatus.value = 'idle'
    curriculumSynchronizationStatus.value = 'refreshing'
    isSavingCurriculum.value = false
    curriculumSaveConflict.value = false
    isRefreshingCurriculumConflict.value = false
    isSavingLessonMaterial.value = false
    catalogError.value = null
    curriculumError.value = null
    detailError.value = null
    lessonMaterialError.value = null
    lessonMaterialSaveError.value = null
    materialGenerationError.value = null
    reviewCompletionError.value = null
  }

  function getRequestedCurriculum(
    studentId: number,
    options?: Parameters<TrainingRepository['getCurriculum']>[2],
  ) {
    const curriculumId = requestedCurriculumId.value
    return curriculumId === null
      ? repository.value.getCurrentCurriculum(studentId, options)
      : repository.value.getCurriculum(studentId, curriculumId, options)
  }

  async function loadForStudent(
    studentId: number,
    curriculumId: number | null = null,
  ): Promise<void> {
    loadController?.abort()
    backgroundRefreshController?.abort()
    backgroundRefreshController = null
    synchronizationController?.abort()
    synchronizationController = null
    resourceController?.abort()
    const controller = new AbortController()
    loadController = controller
    const generation = ++loadGeneration
    resourceGeneration += 1
    requestedCurriculumId.value = curriculumId
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

    const curriculumRequest = getRequestedCurriculum(studentId, { signal: controller.signal })
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

  async function refreshForStudent(studentId: number): Promise<boolean> {
    if (currentStudentId.value !== studentId) {
      await loadForStudent(studentId)
      return catalogStatus.value === 'success' && curriculumStatus.value === 'success'
    }

    backgroundRefreshController?.abort()
    const controller = new AbortController()
    backgroundRefreshController = controller
    const generation = loadGeneration
    const selectedTemplateBefore = selectedTemplateId.value
    const selectedTrainingBefore = selectedTrainingId.value
    const hadCurriculumChanges = hasChanges.value
    const draftTrainingIdsBefore = [...draftTrainingIds.value]

    try {
      const [nextCatalog, nextCurriculum] = await Promise.all([
        repository.value.getCatalog(studentId, { signal: controller.signal }),
        getRequestedCurriculum(studentId, { signal: controller.signal }),
      ])
      if (
        generation !== loadGeneration ||
        currentStudentId.value !== studentId ||
        backgroundRefreshController !== controller
      ) {
        return false
      }

      catalog.value = [...nextCatalog]
      selectedTemplateId.value =
        catalog.value.find((item) => item.trainingTemplateId === selectedTemplateBefore)
          ?.trainingTemplateId ??
        catalog.value[0]?.trainingTemplateId ??
        null
      savedCurriculum.value = nextCurriculum
      const draftStayedUnchanged =
        draftTrainingIds.value.length === draftTrainingIdsBefore.length &&
        draftTrainingIds.value.every((id, index) => id === draftTrainingIdsBefore[index])
      if (!hadCurriculumChanges && draftStayedUnchanged) {
        replaceDraftFromSaved(selectedTrainingBefore)
      }
      catalogStatus.value = 'success'
      curriculumStatus.value = 'success'
      curriculumSynchronizationStatus.value = 'synced'
      catalogError.value = null
      curriculumError.value = null
      return true
    } catch (error) {
      if (
        isAbortError(error) ||
        generation !== loadGeneration ||
        currentStudentId.value !== studentId
      ) {
        return false
      }
      catalogStatus.value = 'error'
      curriculumStatus.value = 'error'
      curriculumSynchronizationStatus.value = 'required'
      catalogError.value = errorMessage(error, '전체 훈련 목록을 새로 고치지 못했습니다.')
      curriculumError.value = errorMessage(error, '최신 커리큘럼을 불러오지 못했습니다.')
      return false
    } finally {
      if (backgroundRefreshController === controller) {
        backgroundRefreshController = null
      }
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

  function applyRecommendedTemplates(templateIds: readonly number[]): boolean {
    if (
      !canEditCurriculum.value ||
      isSavingCurriculum.value ||
      templateIds.length !== CURRICULUM_TRAINING_COUNT
    ) {
      return false
    }
    const availableIds = new Set(catalog.value.map((item) => item.trainingTemplateId))
    if (
      new Set(templateIds).size !== CURRICULUM_TRAINING_COUNT ||
      templateIds.some((templateId) => !availableIds.has(templateId))
    ) {
      return false
    }

    clearSelectedTrainingResources()
    draftItems.value = templateIds.map((trainingTemplateId) => ({
      key: `ai-draft-${++draftKeySequence}`,
      trainingTemplateId,
      trainingId: null,
    }))
    const first = draftItems.value[0] ?? null
    selectedDraftItemKey.value = first?.key ?? null
    selectedTemplateId.value = first?.trainingTemplateId ?? null
    return true
  }

  function removeDraftItem(key: string): void {
    if (!canEditCurriculum.value || isSavingCurriculum.value) return
    const index = draftItems.value.findIndex((item) => item.key === key)
    if (index < 0) return
    const removed = draftItems.value[index]
    draftItems.value = draftItems.value.filter((item) => item.key !== key)
    if (removed?.trainingId !== null && removed?.trainingId !== undefined) {
      const { [removed.trainingId]: _removedDetail, ...remainingDetails } = trainingDetailById.value
      trainingDetailById.value = remainingDetails
      const { [removed.trainingId]: _removedMaterial, ...remainingMaterials } =
        lessonMaterialByTrainingId.value
      lessonMaterialByTrainingId.value = remainingMaterials
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
    trainingDetailById.value = {}
    lessonMaterialByTrainingId.value = {}
    detailStatus.value = 'idle'
    lessonMaterialStatus.value = 'idle'
    lessonMaterialSaveStatus.value = 'idle'
    lessonMaterialSaveIssue.value = null
    lessonMaterialFieldErrors.value = []
    lessonMaterialRemoteChange.value = false
    lessonMaterialRemoteRevision.value = null
    lessonMaterialEditingTrainingId.value = null
    lessonMaterialHasLocalChanges.value = false
    detailError.value = null
    lessonMaterialError.value = null
    lessonMaterialSaveError.value = null
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
      const curriculum = await getRequestedCurriculum(studentId, {
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
      const curriculum = await getRequestedCurriculum(studentId, {
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
    materialGenerationStatus.value = 'idle'
    materialGenerationError.value = null
    lessonMaterialSaveStatus.value = 'idle'
    lessonMaterialSaveIssue.value = null
    lessonMaterialFieldErrors.value = []
    lessonMaterialRemoteChange.value = false
    lessonMaterialRemoteRevision.value = null
    lessonMaterialEditingTrainingId.value = null
    lessonMaterialHasLocalChanges.value = false
    lessonMaterialSaveError.value = null
    if (item.trainingId === null) {
      resourceController?.abort()
      resourceGeneration += 1
      detailStatus.value = 'idle'
      lessonMaterialStatus.value = 'idle'
      detailError.value = null
      lessonMaterialError.value = null
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
    detailStatus.value = 'loading'
    lessonMaterialStatus.value = 'loading'
    lessonMaterialSaveIssue.value = null
    lessonMaterialFieldErrors.value = []
    lessonMaterialRemoteChange.value = false
    lessonMaterialRemoteRevision.value = null
    detailError.value = null
    lessonMaterialError.value = null

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

    const lessonMaterialRequest = repository.value
      .getLessonMaterial(studentId, trainingId, { signal: controller.signal })
      .then((document) => {
        if (generation !== resourceGeneration || selectedTrainingId.value !== trainingId) return
        lessonMaterialByTrainingId.value = {
          ...lessonMaterialByTrainingId.value,
          [trainingId]: document,
        }
        lessonMaterialStatus.value = 'success'
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || generation !== resourceGeneration) return
        lessonMaterialStatus.value = 'error'
        lessonMaterialError.value = errorMessage(error, '교안 편집 자료를 불러오지 못했습니다.')
      })

    await Promise.all([detailRequest, lessonMaterialRequest])
    if (generation === resourceGeneration) resourceController = null
  }

  function setLessonMaterialEditingState(trainingId: number | null, hasLocalChanges = false): void {
    lessonMaterialEditingTrainingId.value = trainingId
    lessonMaterialHasLocalChanges.value = trainingId !== null && hasLocalChanges
  }

  function clearLessonMaterialFieldError(path: string): void {
    if (!path) return
    if (path === 'materials') {
      lessonMaterialFieldErrors.value = []
      return
    }
    lessonMaterialFieldErrors.value = lessonMaterialFieldErrors.value.filter(
      (error) =>
        error.path !== path &&
        !error.path.startsWith(`${path}.`) &&
        !error.path.startsWith(`${path}[`),
    )
  }

  async function reloadSelectedLessonMaterial(): Promise<boolean> {
    const studentId = currentStudentId.value
    const trainingId = selectedTrainingId.value
    if (studentId === null || trainingId === null) return false

    lessonMaterialStatus.value = 'loading'
    lessonMaterialError.value = null
    try {
      const document = await repository.value.getLessonMaterial(studentId, trainingId)
      if (selectedTrainingId.value !== trainingId || currentStudentId.value !== studentId) {
        return false
      }
      lessonMaterialByTrainingId.value = {
        ...lessonMaterialByTrainingId.value,
        [trainingId]: document,
      }
      lessonMaterialStatus.value = 'success'
      lessonMaterialSaveStatus.value = 'idle'
      lessonMaterialSaveIssue.value = null
      lessonMaterialSaveError.value = null
      lessonMaterialFieldErrors.value = []
      lessonMaterialRemoteChange.value = false
      lessonMaterialRemoteRevision.value = null
      lessonMaterialHasLocalChanges.value = false
      return true
    } catch (error) {
      lessonMaterialStatus.value = 'error'
      lessonMaterialError.value = errorMessage(error, '최신 교안을 불러오지 못했습니다.')
      return false
    }
  }

  async function handleLessonMaterialContentUpdated(
    studentId: number,
    trainingId: number,
  ): Promise<boolean> {
    if (currentStudentId.value !== studentId) return true
    const curriculumId = savedCurriculum.value?.curriculumId ?? requestedCurriculumId.value
    if (curriculumId === null) return false

    const selectedId = selectedTrainingId.value
    const hadCurriculumChanges = hasChanges.value
    const requests: Promise<unknown>[] = []
    let succeeded = true

    requests.push(
      repository.value
        .getCurriculum(studentId, curriculumId)
        .then((curriculum) => {
          if (currentStudentId.value !== studentId) return
          savedCurriculum.value = curriculum
          if (!hadCurriculumChanges) replaceDraftFromSaved(selectedId)
          curriculumStatus.value = 'success'
          curriculumSynchronizationStatus.value = 'synced'
        })
        .catch((error: unknown) => {
          succeeded = false
          curriculumStatus.value = 'error'
          curriculumSynchronizationStatus.value = 'required'
          curriculumError.value = errorMessage(error, '최신 커리큘럼을 불러오지 못했습니다.')
        }),
    )

    if (selectedId === trainingId) {
      lessonMaterialStatus.value = 'loading'
      lessonMaterialError.value = null
      requests.push(
        Promise.all([
          repository.value.getTrainingDetail(studentId, trainingId),
          repository.value.getLessonMaterial(studentId, trainingId),
        ])
          .then(([detail, document]) => {
            if (currentStudentId.value !== studentId || selectedTrainingId.value !== trainingId) {
              return
            }
            trainingDetailById.value = {
              ...trainingDetailById.value,
              [trainingId]: detail,
            }
            detailStatus.value = 'success'
            const hasProtectedDraft =
              lessonMaterialEditingTrainingId.value === trainingId &&
              lessonMaterialHasLocalChanges.value
            const currentRevision = lessonMaterialByTrainingId.value[trainingId]?.revision ?? null
            if (hasProtectedDraft && currentRevision !== document.revision) {
              lessonMaterialRemoteChange.value = true
              lessonMaterialRemoteRevision.value = document.revision
            } else if (!hasProtectedDraft) {
              lessonMaterialByTrainingId.value = {
                ...lessonMaterialByTrainingId.value,
                [trainingId]: document,
              }
              lessonMaterialRemoteChange.value = false
              lessonMaterialRemoteRevision.value = null
              lessonMaterialSaveIssue.value = null
              lessonMaterialFieldErrors.value = []
            }
            lessonMaterialStatus.value = 'success'
          })
          .catch((error: unknown) => {
            succeeded = false
            lessonMaterialStatus.value = 'error'
            lessonMaterialError.value = errorMessage(error, '최신 교안을 불러오지 못했습니다.')
          }),
      )
    }

    await Promise.all(requests)
    return succeeded
  }

  async function regenerateSelectedTraining(): Promise<boolean> {
    const studentId = currentStudentId.value
    const trainingId = selectedTrainingId.value
    if (
      studentId === null ||
      trainingId === null ||
      !requiresMaterialRegeneration.value ||
      materialGenerationStatus.value === 'loading'
    ) {
      return false
    }

    materialGenerationStatus.value = 'loading'
    materialGenerationError.value = null
    try {
      const generatedData = await repository.value.generateTraining(studentId, trainingId)
      const currentDetail = trainingDetailById.value[trainingId]
      if (currentDetail) {
        trainingDetailById.value = {
          ...trainingDetailById.value,
          [trainingId]: {
            ...currentDetail,
            generatedData,
            status: 'NOT_STARTED',
          },
        }
      }
      await handleLessonMaterialContentUpdated(studentId, trainingId)
      materialGenerationStatus.value = 'success'
      return true
    } catch (error) {
      materialGenerationStatus.value = 'error'
      materialGenerationError.value = errorMessage(error, 'AI 교안을 생성하지 못했습니다.')
      return false
    }
  }

  async function saveSelectedLessonMaterial(request: SaveLessonMaterialRequest): Promise<boolean> {
    const studentId = currentStudentId.value
    const trainingId = selectedTrainingId.value
    const current = selectedLessonMaterial.value
    if (
      studentId === null ||
      trainingId === null ||
      !current?.editable ||
      isSavingLessonMaterial.value
    ) {
      return false
    }

    isSavingLessonMaterial.value = true
    lessonMaterialSaveStatus.value = 'loading'
    lessonMaterialSaveIssue.value = null
    lessonMaterialFieldErrors.value = []
    lessonMaterialSaveError.value = null
    try {
      const saved = await repository.value.saveLessonMaterial(studentId, trainingId, request)
      lessonMaterialByTrainingId.value = {
        ...lessonMaterialByTrainingId.value,
        [trainingId]: {
          ...current,
          revision: saved.revision,
          materials: [...saved.materials],
        },
      }
      lessonMaterialSaveStatus.value = 'success'
      lessonMaterialRemoteChange.value = false
      lessonMaterialRemoteRevision.value = null
      lessonMaterialHasLocalChanges.value = false
      await handleLessonMaterialContentUpdated(studentId, trainingId)
      return true
    } catch (error) {
      lessonMaterialSaveStatus.value = 'error'
      if (isApiError(error) && error.code === 'LESSON_MATERIAL_REVISION_CONFLICT') {
        lessonMaterialSaveIssue.value = 'revision-conflict'
        lessonMaterialRemoteChange.value = true
        lessonMaterialSaveError.value =
          '다른 화면에서 교안이 변경되었습니다. 작성 중인 내용을 확인한 뒤 최신 교안을 불러와 주세요.'
      } else if (isApiError(error) && error.code === 'TRAINING_NOT_EDITABLE') {
        lessonMaterialSaveIssue.value = 'not-editable'
        lessonMaterialByTrainingId.value = {
          ...lessonMaterialByTrainingId.value,
          [trainingId]: { ...current, editable: false },
        }
        lessonMaterialSaveError.value =
          '진행 중이거나 완료된 훈련으로 변경되어 더 이상 교안을 저장할 수 없습니다.'
      } else if (isApiError(error) && error.code === 'LESSON_MATERIAL_VALIDATION_FAILED') {
        lessonMaterialSaveIssue.value = 'validation'
        lessonMaterialFieldErrors.value = lessonMaterialValidationErrors(error)
        lessonMaterialSaveError.value =
          lessonMaterialFieldErrors.value.length > 0
            ? '입력한 교안 내용에서 확인이 필요한 항목이 있습니다.'
            : errorMessage(error, '교안 입력값을 다시 확인해 주세요.')
      } else {
        lessonMaterialSaveIssue.value = 'network'
        lessonMaterialSaveError.value = errorMessage(
          error,
          '네트워크 문제로 교안을 저장하지 못했습니다. 작성 내용은 유지됩니다.',
        )
      }
      return false
    } finally {
      isSavingLessonMaterial.value = false
    }
  }

  async function completeCurriculumReview(): Promise<boolean> {
    const studentId = currentStudentId.value
    const curriculum = savedCurriculum.value
    if (studentId === null || curriculum === null || !canCompleteReview.value) return false

    reviewCompletionStatus.value = 'loading'
    reviewCompletionError.value = null
    let reviewCompleted = false
    try {
      const result = await repository.value.completeCurriculumReview(
        studentId,
        curriculum.curriculumId,
      )
      reviewCompleted = true
      if (
        currentStudentId.value !== studentId ||
        savedCurriculum.value?.curriculumId !== curriculum.curriculumId
      ) {
        return false
      }
      savedCurriculum.value = {
        ...savedCurriculum.value,
        reviewStatus: result.reviewStatus,
        reviewedByTeacherId: result.reviewedByTeacherId,
        reviewedAt: result.reviewedAt,
      }
      const latest = await repository.value.getCurriculum(studentId, curriculum.curriculumId)
      if (
        currentStudentId.value !== studentId ||
        savedCurriculum.value?.curriculumId !== curriculum.curriculumId
      ) {
        return false
      }
      savedCurriculum.value = latest
      replaceDraftFromSaved(selectedTrainingId.value)
      reviewCompletionStatus.value = 'success'
      return true
    } catch (error) {
      reviewCompletionStatus.value = 'error'
      if (reviewCompleted) {
        curriculumSynchronizationStatus.value = 'required'
        reviewCompletionError.value =
          '최종 검수는 완료됐지만 최신 상태를 불러오지 못했습니다. 최신 내용을 다시 확인해 주세요.'
      } else if (isApiError(error) && error.status === 403) {
        reviewCompletionError.value = '이 학습자의 추천 커리큘럼을 검수할 권한이 없습니다.'
      } else if (isApiError(error) && error.status === 404) {
        reviewCompletionError.value = '추천 커리큘럼을 찾을 수 없습니다.'
      } else if (isApiError(error) && error.status === 409) {
        reviewCompletionError.value =
          '서버의 커리큘럼 상태가 변경되었습니다. 최신 내용을 다시 불러온 뒤 검수해 주세요.'
      } else {
        reviewCompletionError.value = errorMessage(error, '최종 검수를 완료하지 못했습니다.')
      }
      return false
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

  async function requestHistoryForStudent(
    studentId: number,
    background: boolean,
  ): Promise<boolean> {
    abortHistoryRequests()
    historyGeneration += 1
    historyCurriculumGeneration += 1
    historyDetailGeneration += 1
    historyGazeGeneration += 1
    if (background) {
      curriculumLogsError.value = null
      curriculumLogsUiError.value = null
    } else {
      clearHistoryState(studentId, true)
    }
    return loadCurriculumLogs(studentId, background)
  }

  async function loadHistoryForStudent(studentId: number): Promise<void> {
    const background =
      historyStudentId.value === studentId && curriculumLogsStatus.value === 'success'
    await requestHistoryForStudent(studentId, background)
  }

  function refreshHistoryForStudent(studentId: number): Promise<boolean> {
    const background =
      historyStudentId.value === studentId && curriculumLogsStatus.value === 'success'
    return requestHistoryForStudent(studentId, background)
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
    await loadCurriculumLogs(studentId, false)
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
    await loadCurriculumLogs(studentId, false)
  }

  async function loadCurriculumLogs(studentId: number, background = false): Promise<boolean> {
    const controller = new AbortController()
    historyController = controller
    const generation = historyGeneration
    const requestedPeriod = period.value
    if (!background && curriculumLogs.value.length === 0) curriculumLogsStatus.value = 'loading'
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
        return false
      }
      const retainedCurriculumId = selectedCurriculumId.value
      curriculumLogs.value = [...logs].sort(
        (left, right) =>
          right.date.localeCompare(left.date) || right.curriculumId - left.curriculumId,
      )
      selectedCurriculumId.value = curriculumLogs.value.some(
        (item) => item.curriculumId === retainedCurriculumId,
      )
        ? retainedCurriculumId
        : (curriculumLogs.value[0]?.curriculumId ?? null)
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
      return (
        curriculumLogsStatus.value === 'success' &&
        [
          trainingLogStatus.value,
          statisticsStatus.value,
          historyDetailStatus.value,
          historyGazeStatus.value,
        ].every((status) => status === 'idle' || status === 'success')
      )
    } catch (error) {
      if (isAbortError(error) || generation !== historyGeneration) return false
      if (!background) curriculumLogsStatus.value = 'error'
      curriculumLogsUiError.value = mapCommonError(error)
      curriculumLogsError.value = historyErrorMessage(
        error,
        '완료된 커리큘럼 기록을 불러오지 못했습니다.',
      )
      return false
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
    await loadHistoryCurriculum(studentId, curriculumId, false)
  }

  async function loadHistoryCurriculum(
    studentId: number,
    curriculumId: number,
    loadInitialTraining = true,
  ): Promise<void> {
    const isBackgroundRefresh =
      selectedCurriculumId.value === curriculumId && trainingLog.value !== null
    historyCurriculumController?.abort()
    if (loadInitialTraining) {
      historyDetailController?.abort()
      historyGazeController?.abort()
    }
    const controller = new AbortController()
    historyCurriculumController = controller
    const generation = ++historyCurriculumGeneration
    if (loadInitialTraining) {
      historyDetailGeneration += 1
      historyGazeGeneration += 1
    }
    selectedCurriculumId.value = curriculumId
    if (!isBackgroundRefresh) {
      trainingLogStatus.value = 'loading'
      statisticsStatus.value = 'loading'
      if (loadInitialTraining) {
        selectedHistoryTrainingId.value = null
        historyTrainingDetail.value = null
        historyGazeAnalysis.value = null
        historyDetailStatus.value = 'idle'
        historyGazeStatus.value = 'idle'
      }
    }
    trainingLogError.value = null
    statisticsError.value = null
    if (loadInitialTraining) {
      historyDetailError.value = null
      historyGazeError.value = null
      exportError.value = null
    }

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
        if (loadInitialTraining && !currentStillExists) {
          selectedHistoryTrainingId.value = log.trainings[0]?.trainingId ?? null
        }
        trainingLogStatus.value = 'success'
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || generation !== historyCurriculumGeneration) return
        trainingLogStatus.value = 'error'
        trainingLogError.value = historyErrorMessage(
          error,
          '선택한 커리큘럼의 학습 이력을 불러오지 못했습니다.',
        )
      })

    const statisticsRequest = repository.value
      .getStatistics(studentId, curriculumId, {
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
    if (loadInitialTraining && selectedHistoryTrainingId.value !== null) {
      await Promise.all([
        loadHistoryTrainingDetail(studentId, selectedHistoryTrainingId.value),
        loadHistoryTrainingGaze(studentId, selectedHistoryTrainingId.value),
      ])
    }
  }

  async function selectHistoryTraining(studentId: number, trainingId: number): Promise<void> {
    if (studentId !== historyStudentId.value) return
    if (!trainingLog.value?.trainings.some((item) => item.trainingId === trainingId)) return
    if (selectedHistoryTrainingId.value !== trainingId) {
      historyDetailStatus.value = 'loading'
      historyGazeStatus.value = 'loading'
    }
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
    if (historyTrainingDetail.value === null) historyDetailStatus.value = 'loading'
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
    if (historyGazeAnalysis.value === null) historyGazeStatus.value = 'loading'
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
    backgroundRefreshController?.abort()
    backgroundRefreshController = null
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
    trainingDetailById.value = {}
    lessonMaterialByTrainingId.value = {}
    catalogStatus.value = 'idle'
    curriculumStatus.value = 'idle'
    detailStatus.value = 'idle'
    lessonMaterialStatus.value = 'idle'
    lessonMaterialSaveStatus.value = 'idle'
    lessonMaterialSaveIssue.value = null
    lessonMaterialFieldErrors.value = []
    lessonMaterialRemoteChange.value = false
    lessonMaterialRemoteRevision.value = null
    lessonMaterialEditingTrainingId.value = null
    lessonMaterialHasLocalChanges.value = false
    materialGenerationStatus.value = 'idle'
    reviewCompletionStatus.value = 'idle'
    curriculumSynchronizationStatus.value = 'refreshing'
    isSavingCurriculum.value = false
    curriculumSaveConflict.value = false
    isRefreshingCurriculumConflict.value = false
    isSavingLessonMaterial.value = false
    catalogError.value = null
    curriculumError.value = null
    detailError.value = null
    lessonMaterialError.value = null
    lessonMaterialSaveError.value = null
    materialGenerationError.value = null
    reviewCompletionError.value = null
    requestedCurriculumId.value = null
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
    selectedTrainingDetail,
    selectedLessonMaterial,
    trainingDetailById,
    lessonMaterialByTrainingId,
    catalogStatus,
    curriculumStatus,
    detailStatus,
    lessonMaterialStatus,
    lessonMaterialSaveStatus,
    lessonMaterialSaveIssue,
    lessonMaterialFieldErrors,
    lessonMaterialRemoteChange,
    lessonMaterialRemoteRevision,
    lessonMaterialEditingTrainingId,
    lessonMaterialHasLocalChanges,
    materialGenerationStatus,
    reviewCompletionStatus,
    curriculumSynchronizationStatus,
    isSavingCurriculum,
    curriculumSaveConflict,
    isRefreshingCurriculumConflict,
    isSavingLessonMaterial,
    catalogError,
    curriculumError,
    detailError,
    lessonMaterialError,
    lessonMaterialSaveError,
    materialGenerationError,
    reviewCompletionError,
    hasChanges,
    canEditCurriculum,
    canCompleteReview,
    requiresMaterialRegeneration,
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
    refreshForStudent,
    refreshHistoryForStudent,
    selectTemplate,
    addSelectedTemplate,
    applyRecommendedTemplates,
    removeDraftItem,
    moveDraftItem,
    discardDraft,
    saveCurriculum,
    refreshCurriculumAfterConflict,
    retryCurriculumSynchronization,
    selectDraftItem,
    loadSelectedTrainingResources,
    setLessonMaterialEditingState,
    clearLessonMaterialFieldError,
    reloadSelectedLessonMaterial,
    handleLessonMaterialContentUpdated,
    regenerateSelectedTraining,
    saveSelectedLessonMaterial,
    completeCurriculumReview,
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
