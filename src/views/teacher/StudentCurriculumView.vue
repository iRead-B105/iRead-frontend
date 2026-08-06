<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Sparkles, Trash2 } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SaveToast from '@/components/common/SaveToast.vue'
import LessonMaterialEditor from '@/components/teacher/LessonMaterialEditor.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import { apiRequest } from '@/lib/api'
import {
  CURRICULUM_TRAINING_COUNT,
  type CurriculumDraftItem,
  type TrainingCatalogItem,
} from '@/features/teacher/training'
import { useTrainingStore } from '@/stores/training'

const route = useRoute()
const router = useRouter()
const trainingStore = useTrainingStore()
const {
  catalog,
  savedCurriculum,
  draftItems,
  selectedTemplateId,
  selectedDraftItemKey,
  selectedTrainingId,
  selectedTraining,
  selectedTrainingDetail,
  selectedLessonMaterial,
  catalogStatus,
  curriculumStatus,
  curriculumSynchronizationStatus,
  detailStatus,
  lessonMaterialStatus,
  lessonMaterialSaveStatus,
  lessonMaterialSaveIssue,
  lessonMaterialFieldErrors,
  lessonMaterialRemoteChange,
  lessonMaterialHasLocalChanges,
  materialGenerationStatus,
  reviewCompletionStatus,
  requiresMaterialRegeneration,
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
  draftTrainingIds,
  canEditCurriculum: canEditCurriculumFromStore,
  canCompleteReview,
} = storeToRefs(trainingStore)

const draggedDraftKey = ref<string | null>(null)
const dragOffsetY = ref(0)
const dragTargetKey = ref<string | null>(null)
const recommendationList = ref<HTMLElement | null>(null)
const selectedCatalogUnit = ref('all')
const materialEditorOpen = ref(false)
const draftPendingDeletionKey = ref<string | null>(null)
const reviewConfirmOpen = ref(false)
const reorderAnnouncement = ref('')
const aiRecommendationStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const aiRecommendationError = ref<string | null>(null)
const aiRecommendation = ref<AiCurriculumRecommendation | null>(null)
const aiRecommendationAppliedTemplateIds = ref<readonly number[] | null>(null)
const { visible: saved, show: showSaved } = useTemporaryNotice()
const toastMessage = ref('커리큘럼 변경 사항이 저장되었습니다.')

function triggerToast(msg: string = '커리큘럼 변경 사항이 저장되었습니다.'): void {
  toastMessage.value = msg
  showSaved()
}

interface AiCurriculumRecommendation {
  readonly recommendationProvider: string
  readonly dataSufficiency: string
  readonly currentStage: number
  readonly maximumAllowedStage: number
  readonly stageRationale: string
  readonly recommendations: readonly {
    readonly sequenceNo: number
    readonly trainingTemplateId: number
    readonly trainingName: string
    readonly role: string
    readonly recommendedDifficulty: number
    readonly score: number
    readonly targetFeatureCodes: readonly string[]
    readonly reasonCodes: readonly string[]
    readonly rationale: string
  }[]
  readonly warnings: readonly string[]
}

interface PointerDragState {
  readonly pointerId: number
  readonly sourceKey: string
  readonly startY: number
  readonly sourceCenterY: number
  readonly minOffsetY: number
  readonly maxOffsetY: number
  readonly targets: readonly {
    readonly key: string
    readonly centerY: number
  }[]
}

let pointerDragState: PointerDragState | null = null
let suppressRowClickUntil = 0

const DRAG_ACTIVATION_THRESHOLD = 6

const recommendationRoleLabels: Record<string, string> = {
  CORE: '집중 연습',
  REINFORCEMENT: '기초 복습',
  STRETCH: '가벼운 도전',
}

const recommendationFeatureLabels: Record<string, string> = {
  'PHONOLOGY.LIAISON.CODA_TO_SILENT_ONSET': '받침 뒤에 모음이 이어질 때 소리 연결하기',
  'PHONOLOGY.LIAISON': '연음',
  'PHONOLOGY.ASPIRATION': '거센소리 변화',
  'PHONOLOGY.NASALIZATION': '비음화',
  'PHONOLOGY.PALATALIZATION': '구개음화',
  'PHONOLOGY.LIQUIDIZATION': '유음화',
  'PHONOLOGY.TENSIFICATION': '된소리되기',
  'PHONOLOGY.CODA_NEUTRALIZATION': '받침 대표음',
  'SYLLABLE.COMPLEX_CODA': '겹받침 음절',
  'WORD.DECODING': '낱말 읽기',
  'SENTENCE.FLUENCY': '문장 유창성',
}

function recommendationRoleLabel(role: string): string {
  return recommendationRoleLabels[role] ?? '맞춤 연습'
}

function recommendationFeatureLabel(featureCode: string): string {
  if (recommendationFeatureLabels[featureCode]) {
    return recommendationFeatureLabels[featureCode]
  }
  const finalPart = featureCode.split('.').at(-1) ?? ''
  if (featureCode.startsWith('GRAPHEME.ONSET.TENSE.')) return `된소리 초성 ${finalPart}`
  if (featureCode.startsWith('GRAPHEME.ONSET.ASPIRATED.')) return `거센소리 초성 ${finalPart}`
  if (featureCode.startsWith('GRAPHEME.ONSET.')) return `첫소리 ${finalPart}`
  if (featureCode.startsWith('GRAPHEME.VOWEL.')) return `모음 ${finalPart}`
  if (featureCode.startsWith('GRAPHEME.CODA.COMPLEX.')) return `겹받침 ${finalPart}`
  if (featureCode.startsWith('GRAPHEME.CODA.')) return `받침 ${finalPart}`
  if (featureCode.startsWith('WORD.SYLLABLE_COUNT.')) return `${finalPart}음절 낱말`
  return '읽기 기초'
}

function recommendationFeatureSummary(featureCodes: readonly string[]): string {
  const codes = featureCodes.filter(
    (code) =>
      code !== 'PHONOLOGY.LIAISON' ||
      !featureCodes.includes('PHONOLOGY.LIAISON.CODA_TO_SILENT_ONSET'),
  )
  return [...new Set(codes.map(recommendationFeatureLabel))].join(' · ') || '읽기 기초 다지기'
}

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const studentId = computed(() => parseStudentId(route.params.id))
const requestedCurriculumId = computed(() => parseStudentId(route.query.curriculumId))
const invalidStudentId = computed(() => studentId.value === null)
const canEditCurriculum = computed(() => canEditCurriculumFromStore.value)
const isCurrentDraftAiRecommendation = computed(() => {
  const appliedTemplateIds = aiRecommendationAppliedTemplateIds.value
  return (
    aiRecommendation.value !== null &&
    appliedTemplateIds !== null &&
    appliedTemplateIds.length === draftTrainingIds.value.length &&
    appliedTemplateIds.every((templateId, index) => templateId === draftTrainingIds.value[index])
  )
})
const canSave = computed(
  () =>
    hasChanges.value &&
    canEditCurriculum.value &&
    curriculumStatus.value === 'success' &&
    !isSavingCurriculum.value,
)
const draftNoticeMessage = computed(() => {
  const count = draftItems.value.length
  if (count < CURRICULUM_TRAINING_COUNT) {
    const diff = CURRICULUM_TRAINING_COUNT - count
    return `훈련을 ${diff}개 더 추가해 총 ${CURRICULUM_TRAINING_COUNT}개로 구성해야 합니다.`
  }
  if (count > CURRICULUM_TRAINING_COUNT) {
    const diff = count - CURRICULUM_TRAINING_COUNT
    return `훈련이 ${diff}개 초과되었습니다. 총 ${CURRICULUM_TRAINING_COUNT}개로 맞춰 주세요.`
  }
  if (hasChanges.value) {
    return '저장되지 않은 변경 사항이 있습니다.'
  }
  return null
})
const showCurriculumFeedback = computed(
  () =>
    curriculumStatus.value === 'error' ||
    curriculumSynchronizationStatus.value === 'required' ||
    curriculumSynchronizationStatus.value === 'refreshing' ||
    curriculumSaveConflict.value ||
    Boolean(curriculumError.value) ||
    Boolean(savedCurriculum.value && !canEditCurriculum.value),
)
const catalogUnitTabs = computed(() => {
  const counts = new Map<string, number>()
  for (const item of catalog.value) {
    counts.set(item.unitName, (counts.get(item.unitName) ?? 0) + 1)
  }
  return [
    { id: 'all', key: 'all', label: '전체', count: catalog.value.length },
    ...Array.from(counts, ([unitName, count], index) => ({
      id: `unit-${index + 1}`,
      key: unitName,
      label: unitName,
      count,
    })),
  ]
})
const selectedCatalogTabId = computed(
  () => catalogUnitTabs.value.find((tab) => tab.key === selectedCatalogUnit.value)?.id ?? 'all',
)
const visibleCatalogRows = computed(() =>
  catalog.value
    .filter(
      (item) => selectedCatalogUnit.value === 'all' || item.unitName === selectedCatalogUnit.value,
    )
    .map((item, rowIndex) => ({ item, rowIndex })),
)

watch(
  [studentId, requestedCurriculumId],
  async ([id, curriculumId]) => {
    materialEditorOpen.value = false
    draftPendingDeletionKey.value = null
    selectedCatalogUnit.value = 'all'
    aiRecommendationStatus.value = 'idle'
    aiRecommendationError.value = null
    aiRecommendation.value = null
    aiRecommendationAppliedTemplateIds.value = null
    cancelPointerDragging()
    if (id === null) {
      trainingStore.reset()
      return
    }
    await trainingStore.loadForStudent(id, curriculumId)
  },
  { immediate: true },
)

watch(curriculumSynchronizationStatus, (status) => {
  if (status === 'synced') return
  materialEditorOpen.value = false
  draftPendingDeletionKey.value = null
  cancelPointerDragging()
})

watch(catalogUnitTabs, (tabs) => {
  if (!tabs.some((tab) => tab.key === selectedCatalogUnit.value)) {
    selectedCatalogUnit.value = 'all'
  }
})

function confirmDiscard(): boolean {
  return true
}

onBeforeRouteUpdate((to) => {
  if (parseStudentId(to.params.id) === studentId.value) return true
  return confirmDiscard()
})

onBeforeRouteLeave(() => confirmDiscard())

function templateFor(item: CurriculumDraftItem): TrainingCatalogItem | null {
  return (
    catalog.value.find((candidate) => candidate.trainingTemplateId === item.trainingTemplateId) ??
    null
  )
}

function attemptNumber(item: CurriculumDraftItem): number {
  let number = 0
  for (const candidate of draftItems.value) {
    if (candidate.trainingTemplateId === item.trainingTemplateId) number += 1
    if (candidate.key === item.key) return number
  }
  return number
}

function attemptCount(item: CurriculumDraftItem): number {
  return draftItems.value.filter(
    (candidate) => candidate.trainingTemplateId === item.trainingTemplateId,
  ).length
}

function attemptLabel(item: CurriculumDraftItem): string {
  const template = templateFor(item)
  const total = attemptCount(item)
  return `${template?.trainingName ?? '훈련'} ${attemptNumber(item)}/${total}회차`
}

function startPointerDragging(item: CurriculumDraftItem, event: PointerEvent): void {
  const eventTarget = event.target
  if (
    event.button !== 0 ||
    !canEditCurriculum.value ||
    isSavingCurriculum.value ||
    !recommendationList.value ||
    (eventTarget instanceof Element &&
      Boolean(eventTarget.closest('.material-edit-button, .remove-button')))
  ) {
    return
  }

  const source = event.currentTarget as HTMLElement | null
  if (!source) return
  const listBounds = recommendationList.value.getBoundingClientRect()
  const sourceBounds = source.getBoundingClientRect()
  const targets = Array.from(
    recommendationList.value.querySelectorAll<HTMLElement>('[data-draft-key]'),
  ).flatMap((element) => {
    const key = element.dataset.draftKey
    if (!key) return []
    const bounds = element.getBoundingClientRect()
    return [{ key, centerY: bounds.top + bounds.height / 2 }]
  })

  pointerDragState = {
    pointerId: event.pointerId,
    sourceKey: item.key,
    startY: event.clientY,
    sourceCenterY: sourceBounds.top + sourceBounds.height / 2,
    minOffsetY: listBounds.top - sourceBounds.top,
    maxOffsetY: listBounds.bottom - sourceBounds.bottom,
    targets,
  }
  draggedDraftKey.value = null
  dragTargetKey.value = item.key
  dragOffsetY.value = 0
}

function movePointerDragging(event: PointerEvent): void {
  if (!pointerDragState || event.pointerId !== pointerDragState.pointerId) return
  const rawOffsetY = event.clientY - pointerDragState.startY
  if (draggedDraftKey.value === null && Math.abs(rawOffsetY) < DRAG_ACTIVATION_THRESHOLD) {
    return
  }
  if (draggedDraftKey.value === null) {
    draggedDraftKey.value = pointerDragState.sourceKey
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
  }
  const offsetY = Math.min(
    pointerDragState.maxOffsetY,
    Math.max(pointerDragState.minOffsetY, rawOffsetY),
  )
  dragOffsetY.value = offsetY
  const currentCenterY = pointerDragState.sourceCenterY + offsetY
  dragTargetKey.value =
    pointerDragState.targets.reduce(
      (closest, candidate) =>
        Math.abs(candidate.centerY - currentCenterY) < Math.abs(closest.centerY - currentCenterY)
          ? candidate
          : closest,
      pointerDragState.targets[0] ?? {
        key: pointerDragState.sourceKey,
        centerY: currentCenterY,
      },
    ).key ?? pointerDragState.sourceKey
  event.preventDefault()
}

function finishPointerDragging(event: PointerEvent): void {
  if (!pointerDragState || event.pointerId !== pointerDragState.pointerId) return
  const { sourceKey } = pointerDragState
  if (draggedDraftKey.value !== sourceKey) {
    cancelPointerDragging()
    return
  }
  const targetKey = dragTargetKey.value
  ;(event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId)
  if (targetKey && targetKey !== sourceKey) {
    const item = draftItems.value.find((candidate) => candidate.key === sourceKey)
    trainingStore.moveDraftItem(sourceKey, targetKey)
    const nextIndex = draftItems.value.findIndex((candidate) => candidate.key === sourceKey)
    if (item && nextIndex >= 0) {
      reorderAnnouncement.value = `${templateFor(item)?.trainingName ?? '훈련'}을(를) ${nextIndex + 1}번째로 이동했습니다.`
    }
  }
  suppressRowClickUntil = Date.now() + 250
  event.preventDefault()
  cancelPointerDragging()
}

function cancelPointerDragging(): void {
  pointerDragState = null
  draggedDraftKey.value = null
  dragTargetKey.value = null
  dragOffsetY.value = 0
}

async function selectDraftItem(item: CurriculumDraftItem): Promise<void> {
  if (studentId.value === null) return
  await trainingStore.selectDraftItem(studentId.value, item.key)
}

async function handleDraftItemClick(item: CurriculumDraftItem, event: MouseEvent): Promise<void> {
  if (Date.now() < suppressRowClickUntil) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  await selectDraftItem(item)
}

async function openMaterialEditor(item: CurriculumDraftItem): Promise<void> {
  if (
    studentId.value === null ||
    item.trainingId === null ||
    curriculumSynchronizationStatus.value !== 'synced'
  ) {
    return
  }
  await selectDraftItem(item)
  materialEditorOpen.value = true
}

async function requestDraftDeletion(item: CurriculumDraftItem): Promise<void> {
  if (!canEditCurriculum.value) return
  if (draftPendingDeletionKey.value === item.key) {
    trainingStore.removeDraftItem(item.key)
    draftPendingDeletionKey.value = null
    trainingStore.setLessonMaterialEditingState(null)
    materialEditorOpen.value = false
    return
  }
  if (studentId.value !== null && item.trainingId !== null) {
    await selectDraftItem(item)
  }
  draftPendingDeletionKey.value = item.key
}

async function saveChanges(): Promise<void> {
  if (draftTrainingIds.value.length !== CURRICULUM_TRAINING_COUNT) {
    triggerToast(`커리큘럼은 ${CURRICULUM_TRAINING_COUNT}개의 훈련으로 구성해야 합니다.`)
    return
  }
  if (await trainingStore.saveCurriculum()) {
    triggerToast('커리큘럼 변경 사항이 저장되었습니다.')
  } else {
    triggerToast('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

async function loadAiRecommendation(): Promise<void> {
  if (studentId.value === null || !canEditCurriculum.value) return

  aiRecommendationStatus.value = 'loading'
  aiRecommendationError.value = null
  try {
    const result = await apiRequest<AiCurriculumRecommendation>(
      `/api/admin/training/${studentId.value}/ai-recommendation`,
      { method: 'POST' },
    )
    const applied = trainingStore.applyRecommendedTemplates(
      result.recommendations.map((item) => item.trainingTemplateId),
    )
    if (!applied) {
      throw new Error('AI 추천을 현재 커리큘럼 편집 목록에 적용할 수 없습니다.')
    }
    aiRecommendation.value = result
    aiRecommendationAppliedTemplateIds.value = result.recommendations.map(
      (item) => item.trainingTemplateId,
    )
    aiRecommendationStatus.value = 'success'
    triggerToast('커리큘럼이 생성되었습니다.')
  } catch {
    aiRecommendation.value = null
    aiRecommendationAppliedTemplateIds.value = null
    aiRecommendationStatus.value = 'error'
    aiRecommendationError.value = '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    triggerToast('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

async function handleAiRecommendationStar(): Promise<void> {
  await loadAiRecommendation()
}

function discardChanges(): void {
  trainingStore.discardDraft()
}

async function retryResources(): Promise<void> {
  if (
    studentId.value === null ||
    selectedTrainingId.value === null ||
    curriculumSynchronizationStatus.value !== 'synced'
  ) {
    return
  }
  await trainingStore.loadSelectedTrainingResources(studentId.value, selectedTrainingId.value)
}

async function retryCurriculumSynchronization(): Promise<void> {
  await trainingStore.retryCurriculumSynchronization()
}

function closeMaterialEditor(): void {
  trainingStore.setLessonMaterialEditingState(null)
  materialEditorOpen.value = false
}

async function refreshCurriculumAfterConflict(): Promise<void> {
  await trainingStore.refreshCurriculumAfterConflict()
}

async function regenerateMaterial(): Promise<void> {
  await trainingStore.regenerateSelectedTraining()
}

async function saveLessonMaterial(
  request: Parameters<typeof trainingStore.saveSelectedLessonMaterial>[0],
): Promise<void> {
  if (await trainingStore.saveSelectedLessonMaterial(request)) {
    triggerToast('교안 내용이 저장되었습니다.')
  }
}

function reviewStatusLabel(): string {
  const labels: Readonly<Record<string, string>> = {
    GENERATION_PENDING: 'AI 콘텐츠 생성 대기',
    REVIEW_REQUIRED: '최종 검수 필요',
    REGENERATION_REQUIRED: 'AI 콘텐츠 재생성 필요',
    REVIEW_COMPLETED: '최종 검수 완료',
    NOT_REQUIRED: '최종 검수 대상 아님',
  }
  const status = savedCurriculum.value?.reviewStatus ?? 'NOT_REQUIRED'
  return labels[status] ?? status
}

function reviewStatusDescription(): string {
  const status = savedCurriculum.value?.reviewStatus
  if (status === 'GENERATION_PENDING') {
    return '오전 3시 AI 생성이 끝난 뒤 교안을 확인할 수 있습니다.'
  }
  if (status === 'REGENERATION_REQUIRED') {
    return '구성 또는 생성 조건이 변경되었습니다. 필요한 교안을 다시 생성해 주세요.'
  }
  if (status === 'REVIEW_REQUIRED') {
    return '5개 교안의 최신 내용을 확인하고 최종 검수를 완료해 주세요.'
  }
  if (status === 'REVIEW_COMPLETED') {
    return '최신 검수 내용이 아동용 앱에 제공될 수 있습니다.'
  }
  return '일반 커리큘럼은 실력 도전 최종 검수 대상이 아닙니다.'
}

async function confirmCurriculumReview(): Promise<void> {
  reviewConfirmOpen.value = false
  await trainingStore.completeCurriculumReview()
}

function handleLessonMaterialEditingState(hasLocalChanges: boolean): void {
  trainingStore.setLessonMaterialEditingState(
    materialEditorOpen.value ? selectedTrainingId.value : null,
    hasLocalChanges,
  )
}

function clearLessonMaterialFieldError(path: string): void {
  trainingStore.clearLessonMaterialFieldError(path)
}

async function reloadLatestLessonMaterial(): Promise<void> {
  if (await trainingStore.reloadSelectedLessonMaterial()) {
    trainingStore.setLessonMaterialEditingState(selectedTrainingId.value, false)
  }
}

function addTraining(templateId: number): void {
  trainingStore.selectTemplate(templateId)
  trainingStore.addSelectedTemplate()
}
</script>

<template>
  <div class="curriculum page-stack">
    <PageHeader title="커리큘럼 관리">
      <template #actions>
        <SaveToast :visible="saved" :message="toastMessage" />
      </template>
    </PageHeader>

    <Card v-if="invalidStudentId" class="route-error" role="alert">
      <h2>올바른 학습자를 선택해 주세요.</h2>
      <p>학습자 식별자는 양의 정수여야 하며, 잘못된 주소에서는 API를 호출하지 않습니다.</p>
      <Button type="button" @click="router.push({ name: 'teacher-students' })">
        학습자 목록으로 이동
      </Button>
    </Card>

    <template v-else>
      <Card
        v-if="savedCurriculum?.sourceTestCurriculumId != null"
        class="review-panel"
        :class="`review-panel--${(savedCurriculum.reviewStatus ?? 'GENERATION_PENDING').toLowerCase()}`"
      >
        <div>
          <span class="review-source">
            실력 도전 #{{ savedCurriculum.sourceTestCurriculumId }} 추천
          </span>
          <h2>{{ reviewStatusLabel() }}</h2>
          <p>{{ reviewStatusDescription() }}</p>
          <p v-if="hasChanges || lessonMaterialHasLocalChanges" class="review-warning">
            저장하지 않은 변경 사항이 있어 최종 검수를 완료할 수 없습니다.
          </p>
          <p v-if="reviewCompletionError" class="review-error" role="alert">
            {{ reviewCompletionError }}
          </p>
        </div>
        <Button type="button" :disabled="!canCompleteReview" @click="reviewConfirmOpen = true">
          {{ reviewCompletionStatus === 'loading' ? '최종 검수 처리 중...' : '최종 검수 완료' }}
        </Button>
      </Card>

      <div v-if="catalogStatus === 'error'" class="load-errors" role="alert">
        <div>
          <strong>전체 훈련 목록을 불러오지 못했습니다.</strong>
          <span>{{ catalogError }}</span>
        </div>
        <Button
          variant="outline"
          type="button"
          @click="studentId && trainingStore.loadForStudent(studentId, requestedCurriculumId)"
        >
          다시 시도
        </Button>
      </div>

      <div class="curriculum-workspace">
        <Card class="curriculum-library">
          <header class="section-heading">
            <div>
              <h2>전체 훈련 목록</h2>
            </div>
          </header>

          <div
            v-if="catalogStatus === 'success' && catalog.length"
            class="catalog-tabs"
            role="tablist"
            aria-label="훈련 영역 선택"
          >
            <button
              v-for="tab in catalogUnitTabs"
              :id="`catalog-tab-${tab.id}`"
              :key="tab.key"
              class="catalog-tab"
              :class="{ active: selectedCatalogUnit === tab.key }"
              type="button"
              role="tab"
              aria-controls="training-catalog-panel"
              :aria-selected="selectedCatalogUnit === tab.key"
              @click="selectedCatalogUnit = tab.key"
            >
              {{ tab.label }}
              <span>{{ tab.count }}</span>
            </button>
          </div>

          <p v-if="catalogStatus === 'loading'" class="section-state" role="status">
            전체 훈련 목록을 불러오는 중입니다.
          </p>
          <p v-else-if="catalogStatus === 'success' && catalog.length === 0" class="section-state">
            사용할 수 있는 훈련이 없습니다.
          </p>
          <div
            v-else
            id="training-catalog-panel"
            class="curriculum-table"
            role="tabpanel"
            :aria-labelledby="`catalog-tab-${selectedCatalogTabId}`"
          >
            <div class="curriculum-table__head">
              <span>순서</span><span>훈련명</span><span>정확도</span><span></span>
            </div>
            <div
              v-for="{ item, rowIndex } in visibleCatalogRows"
              :key="item.trainingTemplateId"
              class="curriculum-row"
              :class="{ active: item.trainingTemplateId === selectedTemplateId }"
              tabindex="0"
              role="button"
              :aria-pressed="item.trainingTemplateId === selectedTemplateId"
              @click="trainingStore.selectTemplate(item.trainingTemplateId)"
              @keydown.enter="trainingStore.selectTemplate(item.trainingTemplateId)"
              @keydown.space.prevent="trainingStore.selectTemplate(item.trainingTemplateId)"
            >
              <b>{{ rowIndex + 1 }}</b>
              <span class="training-info">
                <span v-if="selectedCatalogUnit === 'ALL'" class="unit-badge">{{
                  item.unitName
                }}</span>
                <strong>{{ item.trainingName }}</strong>
              </span>
              <span class="achievement">
                <b>{{
                  item.studentAchievementRate === null ? '—' : `${item.studentAchievementRate}%`
                }}</b>
              </span>
              <span class="curriculum-row__action">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  class="add-training-btn"
                  :disabled="!canEditCurriculum || isSavingCurriculum"
                  @click.stop="addTraining(item.trainingTemplateId)"
                >
                  학습 추가
                </Button>
              </span>
            </div>
          </div>
        </Card>

        <Card class="curriculum-panel">
          <section class="next-session">
            <header class="section-heading next-session__heading">
              <div>
                <h2>다음 회차 목록</h2>
                <p v-if="curriculumStatus === 'loading'">커리큘럼을 불러오는 중입니다.</p>
              </div>
              <div class="next-session__actions">
                <Button
                  class="ai-recommendation-toggle"
                  :class="{
                    'is-ai-active': isCurrentDraftAiRecommendation,
                    'is-loading': aiRecommendationStatus === 'loading',
                    'is-prompt-active':
                      !aiRecommendation &&
                      canEditCurriculum &&
                      aiRecommendationStatus !== 'loading',
                  }"
                  variant="ghost"
                  size="sm"
                  type="button"
                  :disabled="
                    !canEditCurriculum || aiRecommendationStatus === 'loading' || isSavingCurriculum
                  "
                  :aria-label="
                    aiRecommendationStatus === 'loading'
                      ? 'AI 커리큘럼 생성 중'
                      : 'AI 커리큘럼 생성'
                  "
                  :title="
                    aiRecommendationStatus === 'loading'
                      ? 'AI 커리큘럼 생성 중'
                      : 'AI 커리큘럼 생성'
                  "
                  @click="handleAiRecommendationStar"
                >
                  <Sparkles aria-hidden="true" />
                  <span>
                    {{
                      aiRecommendationStatus === 'loading'
                        ? 'AI 커리큘럼 생성 중'
                        : 'AI 커리큘럼 생성'
                    }}
                  </span>
                </Button>
                <Button
                  class="save-curriculum-button"
                  :class="{
                    'has-pending-changes': hasChanges && canSave,
                  }"
                  size="sm"
                  type="button"
                  :disabled="!canSave"
                  @click="saveChanges"
                >
                  {{ isSavingCurriculum ? '저장 중...' : '변경 사항 저장' }}
                </Button>
              </div>
            </header>

            <div
              v-if="aiRecommendationStatus === 'error'"
              class="ai-recommendation-preview is-error"
              role="alert"
            >
              {{ aiRecommendationError }}
            </div>
            <div v-if="showCurriculumFeedback" class="curriculum-feedback" aria-live="polite">
              <div
                v-if="curriculumStatus === 'error'"
                class="feedback-message is-error"
                role="alert"
              >
                <span>
                  <strong>다음 회차 커리큘럼을 불러오지 못했습니다.</strong>
                  <small>{{ curriculumError }}</small>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  @click="
                    studentId && trainingStore.loadForStudent(studentId, requestedCurriculumId)
                  "
                >
                  다시 시도
                </Button>
              </div>
              <div
                v-else-if="curriculumSynchronizationStatus === 'required'"
                class="feedback-message is-error"
                role="alert"
              >
                <span>
                  <strong>저장은 완료됐지만 최신 커리큘럼 확인이 필요합니다.</strong>
                  <small>{{ curriculumError }}</small>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  @click="retryCurriculumSynchronization"
                >
                  최신 내용 다시 불러오기
                </Button>
              </div>
              <div
                v-else-if="curriculumSynchronizationStatus === 'refreshing'"
                class="feedback-message"
                role="status"
              >
                <span>
                  <strong>저장된 최신 커리큘럼을 확인하고 있습니다.</strong>
                  <small>확인이 끝날 때까지 편집 기능을 잠시 사용할 수 없습니다.</small>
                </span>
              </div>
              <div
                v-else-if="curriculumSaveConflict"
                class="feedback-message is-error"
                role="alert"
              >
                <span>
                  <strong>커리큘럼 저장 요청이 서버 상태와 충돌했습니다.</strong>
                  <small>{{ curriculumError }}</small>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  :disabled="isRefreshingCurriculumConflict"
                  @click="refreshCurriculumAfterConflict"
                >
                  {{
                    isRefreshingCurriculumConflict
                      ? '불러오는 중...'
                      : '서버 최신 내용으로 되돌리기'
                  }}
                </Button>
              </div>
              <p v-else-if="curriculumError" class="feedback-message is-error" role="alert">
                {{ curriculumError }}
              </p>
              <p
                v-else-if="savedCurriculum && !canEditCurriculum"
                class="feedback-message"
                role="status"
              >
                현재 커리큘럼 상태에서는 수정할 수 없습니다. 실행 전 커리큘럼만 편집할 수 있습니다.
              </p>
            </div>

            <div ref="recommendationList" class="recommendation-list">
              <article
                v-for="(item, index) in draftItems"
                :id="`curriculum-item-${item.key}`"
                :key="item.key"
                :data-draft-key="item.key"
                draggable="false"
                :class="{
                  editable: canEditCurriculum && !isSavingCurriculum,
                  dragging: draggedDraftKey === item.key,
                  'drop-target': dragTargetKey === item.key && draggedDraftKey !== item.key,
                }"
                :style="
                  draggedDraftKey === item.key
                    ? { transform: `translateY(${dragOffsetY}px)` }
                    : undefined
                "
                @dragstart.prevent
                @selectstart.prevent
                @pointerdown="startPointerDragging(item, $event)"
                @pointermove="movePointerDragging"
                @pointerup="finishPointerDragging"
                @pointercancel="cancelPointerDragging"
              >
                <span
                  class="drag-handle"
                  :class="{ enabled: canEditCurriculum && !isSavingCurriculum }"
                  aria-hidden="true"
                ></span>
                <b class="recommendation-order">{{ index + 1 }}</b>
                <button
                  class="recommendation-copy"
                  type="button"
                  :disabled="curriculumSynchronizationStatus !== 'synced'"
                  :aria-label="`${attemptLabel(item)} 선택`"
                  :aria-pressed="selectedDraftItemKey === item.key"
                  @click="handleDraftItemClick(item, $event)"
                >
                  <small>
                    {{ templateFor(item)?.unitName }}
                    <template v-if="templateFor(item)?.studentAchievementRate !== undefined">
                      · 정확도
                      {{
                        templateFor(item)?.studentAchievementRate === null
                          ? '—'
                          : `${templateFor(item)?.studentAchievementRate}%`
                      }}
                    </template>
                  </small>
                  <strong>{{ templateFor(item)?.trainingName }}</strong>
                </button>
                <div class="recommendation-actions">
                  <Button
                    class="material-edit-button"
                    variant="outline"
                    size="sm"
                    type="button"
                    :disabled="
                      item.trainingId === null ||
                      curriculumSynchronizationStatus !== 'synced' ||
                      isSavingCurriculum
                    "
                    @click.stop="openMaterialEditor(item)"
                  >
                    교안 편집
                  </Button>
                  <Button
                    v-if="canEditCurriculum"
                    class="remove-button"
                    :class="{ 'is-confirming': draftPendingDeletionKey === item.key }"
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    :aria-label="
                      draftPendingDeletionKey === item.key
                        ? '삭제 확인, 한 번 더 누르면 삭제'
                        : '훈련 삭제'
                    "
                    :title="
                      draftPendingDeletionKey === item.key ? '한 번 더 누르면 삭제됩니다' : '삭제'
                    "
                    :disabled="!canEditCurriculum || isSavingCurriculum"
                    @click.stop="requestDraftDeletion(item)"
                    @keydown.esc="draftPendingDeletionKey = null"
                  >
                    <Check
                      v-if="draftPendingDeletionKey === item.key"
                      :size="16"
                      aria-hidden="true"
                    />
                    <Trash2 v-else :size="16" aria-hidden="true" />
                  </Button>
                </div>
              </article>
              <p
                v-if="curriculumStatus === 'success' && draftItems.length === 0"
                class="section-state"
              >
                다음 회차가 비어 있습니다. 전체 훈련 목록에서 한 개 이상 추가해 주세요.
              </p>
            </div>

            <div
              v-if="aiRecommendationStatus === 'error'"
              class="ai-recommendation-preview is-error"
              role="alert"
            >
              {{ aiRecommendationError }}
            </div>
            <div
              v-else-if="aiRecommendation"
              id="ai-recommendation-details"
              class="ai-recommendation-preview"
              aria-live="polite"
              role="status"
            >
              <header class="ai-recommendation-preview__header">
                <span class="ai-recommendation-preview__icon" aria-hidden="true">
                  <Sparkles />
                </span>
                <div class="ai-recommendation-preview__title">
                  <small>AI 커리큘럼 제안</small>
                  <strong>학습 기록을 바탕으로 이렇게 구성했어요</strong>
                </div>
              </header>
              <ol class="ai-recommendation-preview__list">
                <li
                  v-for="(item, index) in aiRecommendation.recommendations"
                  :key="item.trainingTemplateId"
                >
                  <span class="ai-recommendation-preview__order">{{ index + 1 }}</span>
                  <span>
                    <strong>{{ item.trainingName }}</strong>
                    <small>
                      {{ recommendationRoleLabel(item.role) }} ·
                      {{ recommendationFeatureSummary(item.targetFeatureCodes) }}
                    </small>
                  </span>
                </li>
              </ol>
            </div>
            <div v-else class="ai-recommendation-preview is-placeholder">
              <header class="ai-recommendation-preview__header">
                <span class="ai-recommendation-preview__icon" aria-hidden="true">
                  <Sparkles />
                </span>
                <div class="ai-recommendation-preview__title">
                  <small>AI 맞춤 커리큘럼</small>
                  <strong>아동의 최신 학습 기록을 바탕으로 커리큘럼을 AI가 추천해 드려요</strong>
                  <p class="ai-recommendation-preview__desc">
                    아동의 강점과 보완이 필요한 영역을 다각도로 분석하여 최적의 훈련을 자동으로
                    구성합니다.
                  </p>
                </div>
              </header>
            </div>
            <p class="sr-only" role="status" aria-live="polite">
              {{ reorderAnnouncement }}
            </p>

            <div class="draft-actions-shell">
              <div
                v-if="draftNoticeMessage"
                class="draft-actions"
                :class="{ 'is-invalid-count': draftItems.length !== CURRICULUM_TRAINING_COUNT }"
              >
                <span>{{ draftNoticeMessage }}</span>
                <Button
                  v-if="hasChanges"
                  variant="ghost"
                  size="sm"
                  type="button"
                  :disabled="!canEditCurriculum || isSavingCurriculum"
                  @click="discardChanges"
                >
                  변경 취소
                </Button>
              </div>
            </div>
          </section>
        </Card>
      </div>
    </template>

    <ConfirmDialog
      :open="reviewConfirmOpen"
      title="추천 커리큘럼의 최종 검수를 완료할까요?"
      message="현재 저장된 5개 교안이 아동용 앱에 제공될 수 있습니다. 이후 내용을 변경하면 다시 검수해야 합니다."
      confirm-label="최종 검수 완료"
      @cancel="reviewConfirmOpen = false"
      @confirm="confirmCurriculumReview"
    />

    <LessonMaterialEditor
      v-if="materialEditorOpen && selectedTraining"
      v-model:open="materialEditorOpen"
      :training="selectedTraining"
      :detail="selectedTrainingDetail"
      :lesson-material="selectedLessonMaterial"
      :detail-status="detailStatus"
      :lesson-material-status="lessonMaterialStatus"
      :lesson-material-save-status="lessonMaterialSaveStatus"
      :lesson-material-save-issue="lessonMaterialSaveIssue"
      :lesson-material-field-errors="lessonMaterialFieldErrors"
      :lesson-material-remote-change="lessonMaterialRemoteChange"
      :material-generation-status="materialGenerationStatus"
      :requires-regeneration="requiresMaterialRegeneration"
      :is-saving-lesson-material="isSavingLessonMaterial"
      :detail-error="detailError"
      :lesson-material-error="lessonMaterialError"
      :lesson-material-save-error="lessonMaterialSaveError"
      :material-generation-error="materialGenerationError"
      :review-required-after-save="savedCurriculum?.sourceTestCurriculumId != null"
      @close="closeMaterialEditor"
      @regenerate="regenerateMaterial"
      @retry="retryResources"
      @reload-latest="reloadLatestLessonMaterial"
      @editing-state-change="handleLessonMaterialEditingState"
      @field-edited="clearLessonMaterialFieldError"
      @save="saveLessonMaterial"
    />
  </div>
</template>

<style scoped>
.curriculum {
  position: relative;
  gap: 20px;
  container-type: inline-size;
}
.route-error,
.load-errors {
  padding: 24px;
}
.route-error h2 {
  margin: 0;
  font-size: 18px;
}
.route-error p {
  margin: 8px 0 18px;
  color: var(--slate-500);
}
.review-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  border-color: var(--primary-200);
  background: color-mix(in oklch, var(--primary-50) 70%, var(--white));
}
.review-panel h2 {
  margin: 5px 0 0;
  font-size: 18px;
}
.review-panel p {
  margin: 5px 0 0;
  color: var(--slate-600);
  font-size: 13px;
}
.review-source {
  color: var(--primary-700);
  font-size: 12px;
  font-weight: 800;
}
.review-warning {
  color: var(--warning-700) !important;
  font-weight: 700;
}
.review-error {
  color: var(--danger-600) !important;
  font-weight: 700;
}
.review-panel--review_completed {
  border-color: var(--success-200);
  background: color-mix(in oklch, var(--success-50) 70%, var(--white));
}
.load-errors {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 18px;
  border: 1px solid color-mix(in oklch, var(--danger-600) 32%, var(--border));
  border-radius: var(--radius-md);
  background: color-mix(in oklch, var(--danger-600) 4%, var(--white));
}
.load-errors > div {
  display: grid;
  gap: 3px;
}
.load-errors strong {
  color: var(--danger-600);
}
.load-errors span {
  color: var(--slate-600);
  font-size: 12px;
}
.load-errors .button {
  margin-left: auto;
}
.curriculum-workspace {
  display: grid;
  align-items: stretch;
  gap: 20px;
  grid-template-columns: minmax(0, 1.08fr) minmax(410px, 0.92fr);
}
.curriculum-library,
.curriculum-panel {
  height: 100%;
  min-width: 0;
  gap: 0;
  padding: 20px;
  border-radius: var(--radius-lg);
}
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}
.section-heading h2 {
  margin: 0;
  font-size: 17px;
}
.section-heading p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}
.section-heading > span {
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 600;
}
.section-state {
  margin: 18px 0 0;
  padding: 24px 12px;
  border: 1px dashed var(--slate-300);
  border-radius: var(--radius-sm);
  color: var(--slate-500);
  font-size: 12px;
  text-align: center;
}
.catalog-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 6px;
  margin-top: 14px;
  padding-bottom: 0;
}
.catalog-tab {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card);
  color: var(--slate-600);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}
.catalog-tab span {
  color: var(--slate-400);
  font-size: 10px;
}
.catalog-tab:hover {
  background: var(--interactive-hover-background);
}
.catalog-tab.active {
  border-color: color-mix(in oklch, var(--primary-600) 42%, var(--border));
  background: var(--active-selection-background);
  color: var(--active-selection-foreground);
}
.catalog-tab.active span {
  color: var(--primary-700);
}
.curriculum-table {
  overflow: auto;
  max-height: min(640px, max(240px, calc(100dvh - 250px)));
  margin: 10px 0 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.curriculum-table__head,
.curriculum-row {
  display: grid;
  align-items: center;
  gap: 12px;
  grid-template-columns: 46px minmax(0, 1fr) 72px 92px;
}
.curriculum-table__head {
  position: sticky;
  z-index: 2;
  top: 0;
  min-height: 40px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--slate-300);
  background: var(--muted);
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 600;
}
.curriculum-row {
  position: relative;
  width: 100%;
  min-height: 52px;
  padding: 8px 14px;
  border: 0;
  border-bottom: 1px solid var(--slate-200);
  background: transparent;
  color: var(--slate-700);
  text-align: left;
  cursor: pointer;
}
.curriculum-row::before {
  position: absolute;
  top: 9px;
  bottom: 9px;
  left: 0;
  width: 3px;
  background: transparent;
  content: '';
}
.curriculum-row:hover {
  background: var(--interactive-hover-background);
}
.curriculum-row.active {
  background: var(--active-selection-background);
  color: var(--active-selection-foreground);
}
.curriculum-row.active::before {
  background: var(--primary-600);
}
.training-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}
.unit-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--slate-100, #f1f5f9);
  color: var(--slate-600, #475569);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.achievement {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--slate-800, #1e293b);
  font-size: 13px;
  font-weight: 600;
}
.curriculum-row__action {
  display: flex;
  justify-content: flex-end;
}
.curriculum-row .add-training-btn {
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.15s ease,
    visibility 0.15s ease;
}
.curriculum-row:hover .add-training-btn,
.curriculum-row:focus-within .add-training-btn,
.curriculum-row.active .add-training-btn {
  opacity: 1;
  visibility: visible;
}
.next-session {
  margin-top: 0;
}
.next-session__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.ai-recommendation-toggle {
  border: 1px solid var(--border);
  background: var(--white);
  color: var(--slate-400);
}
.ai-recommendation-toggle svg {
  transition:
    fill 160ms ease,
    filter 160ms ease,
    transform 160ms ease;
}
.ai-recommendation-toggle.is-ai-active {
  border-color: color-mix(in oklch, var(--primary-600) 42%, var(--border));
  background: color-mix(in oklch, var(--primary-50) 74%, var(--white));
  color: var(--primary-700);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary-500) 14%, transparent);
}
.ai-recommendation-toggle.is-ai-active svg {
  fill: currentcolor;
  filter: drop-shadow(0 0 4px color-mix(in oklch, var(--primary-500) 55%, transparent));
}
.ai-recommendation-toggle.is-loading svg {
  animation: ai-star-pulse 800ms ease-in-out infinite alternate;
}
.ai-recommendation-toggle.is-prompt-active {
  position: relative;
  background: transparent;
  color: var(--primary-700);
  font-weight: 600;
  animation: ai-button-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
}
.ai-recommendation-toggle.is-prompt-active:hover {
  background: color-mix(in oklch, var(--slate-100) 80%, transparent);
  color: var(--primary-800);
}
@keyframes ai-button-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklch, var(--primary-500) 45%, transparent);
  }
  70% {
    box-shadow: 0 0 0 8px color-mix(in oklch, var(--primary-500) 0%, transparent);
  }
  100% {
    box-shadow: 0 0 0 0 color-mix(in oklch, var(--primary-500) 0%, transparent);
  }
}
.save-curriculum-button.has-pending-changes {
  position: relative;
  background: var(--primary-600);
  color: var(--white);
  font-weight: 700;
  animation: save-button-pulse 1.8s infinite cubic-bezier(0.4, 0, 0.6, 1);
}
.save-curriculum-button.has-pending-changes:hover {
  background: var(--primary-700);
}
@keyframes save-button-pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 color-mix(in oklch, var(--primary-600) 50%, transparent);
  }
  50% {
    transform: scale(1.03);
    box-shadow: 0 0 0 8px color-mix(in oklch, var(--primary-600) 0%, transparent);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 color-mix(in oklch, var(--primary-600) 0%, transparent);
  }
}
@keyframes ai-star-pulse {
  to {
    opacity: 0.45;
    transform: scale(0.82) rotate(-8deg);
  }
}
.ai-recommendation-preview {
  position: relative;
  display: grid;
  gap: 14px;
  margin-top: 10px;
  padding: 18px;
  overflow: hidden;
  border: 1px solid color-mix(in oklch, var(--primary-600) 35%, var(--border));
  border-radius: 16px;
  background: linear-gradient(
    145deg,
    color-mix(in oklch, var(--primary-50) 78%, var(--white)) 0%,
    var(--white) 72%
  );
  color: var(--slate-700);
  font-size: 12px;
  box-shadow: 0 12px 30px color-mix(in oklch, var(--primary-900) 9%, transparent);
}
.ai-recommendation-preview::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-300), transparent);
  content: '';
}
.ai-recommendation-preview.is-error {
  border-color: color-mix(in oklch, var(--danger-600) 35%, var(--border));
  color: var(--danger-600);
}
.ai-recommendation-preview__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
}
.ai-recommendation-preview__title {
  display: grid;
  gap: 2px;
}
.ai-recommendation-preview__close {
  align-self: start;
  border-radius: 999px;
  color: var(--slate-400);
}
.ai-recommendation-preview__close:hover {
  background: color-mix(in oklch, var(--slate-200) 55%, transparent);
  color: var(--slate-700);
}
.ai-recommendation-preview__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 11px;
  border-top: 1px solid color-mix(in oklch, var(--primary-600) 12%, var(--border));
}
.ai-recommendation-preview__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ai-recommendation-preview.is-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 20px;
  gap: 12px;
}
.ai-recommendation-preview.is-placeholder .ai-recommendation-preview__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}
.ai-recommendation-preview.is-placeholder .ai-recommendation-preview__title {
  text-align: center;
}
.ai-recommendation-preview__desc {
  margin: 4px 0 0;
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
}
.ai-recommendation-preview__generate-btn {
  flex: none;
}
.ai-recommendation-preview__header small {
  color: var(--primary-700);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.ai-recommendation-preview__header strong {
  color: var(--slate-900);
  font-size: 14px;
  line-height: 1.45;
}
.ai-recommendation-preview__icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in oklch, var(--primary-600) 18%, transparent);
  border-radius: 12px;
  background: var(--white);
  color: var(--primary-700);
  box-shadow: 0 5px 12px color-mix(in oklch, var(--primary-700) 10%, transparent);
}
.ai-recommendation-preview__icon svg {
  width: 17px;
  height: 17px;
}
.ai-recommendation-preview__summary {
  margin: 0;
  padding: 11px 12px;
  border-left: 3px solid color-mix(in oklch, var(--primary-600) 54%, transparent);
  border-radius: 0 10px 10px 0;
  background: color-mix(in oklch, var(--primary-50) 50%, transparent);
  color: var(--slate-700);
  line-height: 1.6;
}
.ai-recommendation-preview__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ai-recommendation-preview__list li {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  border: 1px solid color-mix(in oklch, var(--primary-600) 16%, var(--border));
  border-radius: 11px;
  background: color-mix(in oklch, var(--white) 90%, transparent);
  box-shadow: 0 3px 10px color-mix(in oklch, var(--primary-900) 4%, transparent);
}
.ai-recommendation-preview__list li > span:last-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.ai-recommendation-preview__list li strong {
  overflow: hidden;
  color: var(--slate-900);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-recommendation-preview__list li small {
  color: var(--slate-500);
  font-size: 10px;
  line-height: 1.4;
}
.ai-recommendation-preview__order {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--white);
  color: var(--primary-700);
  font-size: 10px;
  font-weight: 800;
}
.ai-recommendation-preview__notice {
  margin: 0;
  color: var(--slate-500);
  font-size: 10px;
  line-height: 1.45;
}
.ai-recommendation-preview__regenerate {
  flex: none;
  border-color: color-mix(in oklch, var(--primary-600) 26%, var(--border));
  background: var(--white);
  color: var(--primary-700);
  box-shadow: 0 3px 9px color-mix(in oklch, var(--primary-900) 6%, transparent);
}
.curriculum-feedback {
  height: 92px;
  margin-top: 8px;
  overflow: auto;
}
.feedback-message {
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 22%, transparent);
  color: var(--slate-600);
  font-size: 12px;
}
.feedback-message > span {
  display: grid;
  gap: 3px;
}
.feedback-message strong {
  color: var(--slate-800);
}
.feedback-message small {
  color: var(--slate-500);
  font-size: 11px;
}
.feedback-message.is-error,
.feedback-message.is-error strong {
  color: var(--danger-600);
}
.recommendation-list {
  position: relative;
  display: grid;
  gap: 8px;
  margin-top: 12px;
  overflow: hidden;
}
.recommendation-list article {
  display: grid;
  min-height: 62px;
  align-items: center;
  gap: 8px;
  padding: 10px 11px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--white);
  grid-template-columns: 20px 22px minmax(0, 1fr) auto;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
  transition: 150ms ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-user-drag: none;
  touch-action: none;
}
.recommendation-list article * {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-user-drag: none;
}
.recommendation-list article.editable:hover {
  border-color: var(--slate-300);
  box-shadow: 0 5px 14px rgb(15 23 42 / 8%);
}
.recommendation-list article:focus,
.recommendation-list article:focus-within,
.recommendation-list article:focus-visible,
.recommendation-copy:focus,
.recommendation-copy:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
.recommendation-list article.editable {
  cursor: grab;
}
.recommendation-list article.editable .recommendation-copy {
  cursor: grab;
}
.recommendation-list article.dragging {
  z-index: 3;
  opacity: 1;
  border-color: var(--primary-400);
  background: var(--white);
  box-shadow: 0 14px 30px rgb(15 23 42 / 18%);
  cursor: grabbing;
  transition: none;
}
.recommendation-list article.dragging .recommendation-copy {
  cursor: grabbing;
}
.recommendation-list article.drop-target {
  border-color: var(--primary-600);
  background: var(--interactive-hover-background);
}
.drag-handle {
  width: 15px;
  height: 21px;
  background-image: radial-gradient(circle, var(--slate-300) 1.4px, transparent 1.6px);
  background-position: 1px 1px;
  background-size: 6px 6px;
}
.drag-handle.enabled {
  background-image: radial-gradient(circle, var(--slate-600) 1.5px, transparent 1.7px);
  cursor: grab;
  touch-action: none;
}
.recommendation-order {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--slate-100);
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 800;
}
.recommendation-copy small,
.recommendation-copy strong {
  display: block;
}
.recommendation-copy {
  min-width: 0;
  padding: 4px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  text-align: left;
}
.recommendation-copy small {
  margin-bottom: 2px;
  color: var(--slate-500);
  font-size: 11px;
}
.recommendation-copy strong {
  color: var(--slate-800);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.recommendation-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 7px;
}
.unsaved-label {
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
}
.remove-button {
  color: var(--slate-400);
  font-size: 18px;
}
.remove-button:hover {
  color: var(--danger-600);
}
.remove-button.is-confirming {
  background: color-mix(in oklch, var(--danger-600) 12%, transparent);
  color: var(--danger-600);
}
.draft-actions-shell {
  min-height: 48px;
  margin-top: 12px;
}
.draft-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 0;
  padding: 10px 14px;
  border: 1px solid #fde68a;
  border-radius: 12px;
  background: #fffbebf0;
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgb(180 83 9 / 6%);
  transition: all 180ms ease;
}
.draft-actions.is-invalid-count {
  border-color: #fca5a5;
  background: #fef2f2;
  color: #991b1b;
  box-shadow: 0 2px 8px rgb(220 38 38 / 6%);
}
@container (max-width: 900px) {
  .curriculum-workspace {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .review-panel {
    align-items: flex-start;
    flex-direction: column;
  }
  .curriculum-library,
  .curriculum-panel {
    padding: 16px;
  }

  .curriculum-table__head,
  .curriculum-row {
    grid-template-columns: 36px 92px minmax(130px, 1fr) 80px;
  }
  .recommendation-list article {
    grid-template-columns: 18px 20px minmax(0, 1fr);
  }
  .recommendation-actions {
    grid-column: 3;
  }

  .ai-recommendation-preview__list {
    grid-template-columns: 1fr;
  }

  .draft-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .curriculum-feedback {
    height: 116px;
  }

  .feedback-message {
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .load-errors,
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .load-errors .button {
    margin-left: 0;
  }

  .curriculum-library,
  .curriculum-panel {
    padding: 14px;
  }

  .selected-training dl {
    grid-template-columns: 1fr;
  }

  .recommendation-list article {
    gap: 6px;
    padding: 10px 8px;
  }
}
</style>
