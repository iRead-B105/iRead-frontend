<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SaveToast from '@/components/common/SaveToast.vue'
import LessonMaterialEditor from '@/components/teacher/LessonMaterialEditor.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import {
  CURRICULUM_TRAINING_COUNT,
  trainingStatusLabel,
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
  selectedTemplate,
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
  materialGenerationStatus,
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
  hasChanges,
  draftTrainingIds,
  canEditCurriculum: canEditCurriculumFromStore,
} = storeToRefs(trainingStore)

const draggedDraftKey = ref<string | null>(null)
const dragOffsetY = ref(0)
const dragTargetKey = ref<string | null>(null)
const recommendationList = ref<HTMLElement | null>(null)
const selectedCatalogUnit = ref('all')
const materialEditorOpen = ref(false)
const draftPendingDeletion = ref<CurriculumDraftItem | null>(null)
const reorderAnnouncement = ref('')
const { visible: saved, show: showSaved } = useTemporaryNotice()

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

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const studentId = computed(() => parseStudentId(route.params.id))
const invalidStudentId = computed(() => studentId.value === null)
const canEditCurriculum = computed(() => canEditCurriculumFromStore.value)
const canSave = computed(
  () =>
    hasChanges.value &&
    draftTrainingIds.value.length === CURRICULUM_TRAINING_COUNT &&
    canEditCurriculum.value &&
    curriculumStatus.value === 'success' &&
    !isSavingCurriculum.value,
)
const curriculumSizeGuidance = computed(() => {
  const difference = CURRICULUM_TRAINING_COUNT - draftTrainingIds.value.length
  if (difference > 0) {
    return `저장하려면 훈련을 ${difference}개 더 추가해 총 ${CURRICULUM_TRAINING_COUNT}개로 구성해야 합니다.`
  }
  if (difference < 0) {
    return `저장하려면 훈련을 ${Math.abs(difference)}개 삭제해 총 ${CURRICULUM_TRAINING_COUNT}개로 구성해야 합니다.`
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
    (hasChanges.value && Boolean(curriculumSizeGuidance.value)) ||
    Boolean(savedCurriculum.value && !canEditCurriculum.value),
)
const selectedAttemptLabel = computed(() => {
  const item = draftItems.value.find((candidate) => candidate.key === selectedDraftItemKey.value)
  return item ? attemptLabel(item) : '선택한 시행'
})
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
    .map((item, catalogIndex) => ({ item, catalogIndex }))
    .filter(
      ({ item }) =>
        selectedCatalogUnit.value === 'all' || item.unitName === selectedCatalogUnit.value,
    ),
)

watch(
  studentId,
  async (id) => {
    materialEditorOpen.value = false
    draftPendingDeletion.value = null
    selectedCatalogUnit.value = 'all'
    cancelPointerDragging()
    if (id === null) {
      trainingStore.reset()
      return
    }
    await trainingStore.loadForStudent(id)
  },
  { immediate: true },
)

watch(curriculumSynchronizationStatus, (status) => {
  if (status === 'synced') return
  materialEditorOpen.value = false
  draftPendingDeletion.value = null
  cancelPointerDragging()
})

watch(catalogUnitTabs, (tabs) => {
  if (!tabs.some((tab) => tab.key === selectedCatalogUnit.value)) {
    selectedCatalogUnit.value = 'all'
  }
})

function confirmDiscard(): boolean {
  return (
    !hasChanges.value || window.confirm('저장하지 않은 커리큘럼 변경 사항을 버리고 이동할까요?')
  )
}

onBeforeRouteUpdate((to) => {
  if (parseStudentId(to.params.id) === studentId.value) return true
  return confirmDiscard()
})

onBeforeRouteLeave(() => confirmDiscard())

function achievementLabel(value: number | null): string {
  if (value === null) return '미수행(평가 기록 없음)'
  if (value >= 80) return '충분'
  if (value >= 60) return '보완 필요'
  return '우선 학습'
}

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
  if (studentId.value !== null && item.trainingId !== null) {
    await selectDraftItem(item)
  }
  draftPendingDeletion.value = item
}

function confirmDraftDeletion(): void {
  if (!draftPendingDeletion.value) return
  trainingStore.removeDraftItem(draftPendingDeletion.value.key)
  draftPendingDeletion.value = null
  trainingStore.setLessonMaterialEditingState(null)
  materialEditorOpen.value = false
}

async function saveChanges(): Promise<void> {
  if (await trainingStore.saveCurriculum()) {
    showSaved()
  }
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
    showSaved()
  }
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

function deletionMessage(): string {
  const item = draftPendingDeletion.value
  if (!item) return ''
  return `${attemptLabel(item)}을(를) 다음 회차에서 제거합니다.`
}
</script>

<template>
  <div class="curriculum page-stack">
    <PageHeader title="커리큘럼 관리">
      <template #actions>
        <SaveToast :visible="saved" inline message="커리큘럼 변경 사항이 저장되었습니다." />
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
      <div v-if="catalogStatus === 'error'" class="load-errors" role="alert">
        <div>
          <strong>전체 훈련 목록을 불러오지 못했습니다.</strong>
          <span>{{ catalogError }}</span>
        </div>
        <Button
          variant="outline"
          type="button"
          @click="studentId && trainingStore.loadForStudent(studentId)"
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
            <span>{{ catalog.length }}개 훈련</span>
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
              <span>순서</span><span>영역</span><span>훈련명</span><span>진행률</span>
            </div>
            <Button
              v-for="{ item, catalogIndex } in visibleCatalogRows"
              :key="item.trainingTemplateId"
              class="curriculum-row"
              :class="{ active: item.trainingTemplateId === selectedTemplateId }"
              type="button"
              :aria-pressed="item.trainingTemplateId === selectedTemplateId"
              @click="trainingStore.selectTemplate(item.trainingTemplateId)"
            >
              <b>{{ catalogIndex + 1 }}</b>
              <span class="unit-label">{{ item.unitName }}</span>
              <strong>{{ item.trainingName }}</strong>
              <span class="achievement">
                <b>
                  {{
                    item.studentAchievementRate === null ? '—' : `${item.studentAchievementRate}%`
                  }}
                </b>
                <small>{{ achievementLabel(item.studentAchievementRate) }}</small>
              </span>
            </Button>
          </div>
        </Card>

        <Card class="curriculum-panel">
          <section class="selected-training">
            <header class="section-heading">
              <h2>선택한 훈련</h2>
            </header>
            <template v-if="selectedTemplate">
              <div class="selected-training__identity">
                <strong>{{ selectedTemplate.trainingName }}</strong>
                <span>{{ selectedTemplate.unitName }} · {{ selectedTemplate.sequence }}단계</span>
              </div>
              <dl>
                <div>
                  <dt>현재 진행률</dt>
                  <dd>
                    {{
                      selectedTemplate.studentAchievementRate === null
                        ? '미수행(평가 기록 없음)'
                        : `${selectedTemplate.studentAchievementRate}%`
                    }}
                  </dd>
                </div>
                <div>
                  <dt>학습 판단</dt>
                  <dd>{{ achievementLabel(selectedTemplate.studentAchievementRate) }}</dd>
                </div>
                <div>
                  <dt>다음 회차 포함</dt>
                  <dd>
                    {{
                      draftItems.filter(
                        (item) => item.trainingTemplateId === selectedTemplate?.trainingTemplateId,
                      ).length
                    }}회
                  </dd>
                </div>
              </dl>
              <div class="selected-training__actions">
                <Button
                  variant="outline"
                  type="button"
                  :disabled="!canEditCurriculum || isSavingCurriculum"
                  @click="trainingStore.addSelectedTemplate"
                >
                  다음 회차에 1회 추가
                </Button>
              </div>
            </template>
            <p v-else class="section-state">전체 훈련 목록에서 훈련을 선택해 주세요.</p>
          </section>

          <section class="next-session">
            <header class="section-heading next-session__heading">
              <div>
                <h2>다음 회차 순서</h2>
                <p v-if="curriculumStatus === 'loading'">커리큘럼을 불러오는 중입니다.</p>
                <p v-else-if="savedCurriculum">
                  {{ draftItems.length }}회 시행 · {{ trainingStatusLabel(savedCurriculum.status) }}
                </p>
                <p v-else>저장된 다음 회차가 없습니다. 훈련을 추가해 새로 구성하세요.</p>
              </div>
              <Button
                class="save-curriculum-button"
                size="sm"
                type="button"
                :disabled="!canSave"
                @click="saveChanges"
              >
                {{
                  isSavingCurriculum
                    ? '저장 중...'
                    : savedCurriculum
                      ? '변경 사항 저장'
                      : '커리큘럼 생성'
                }}
              </Button>
            </header>

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
                  @click="studentId && trainingStore.loadForStudent(studentId)"
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
                v-else-if="hasChanges && curriculumSizeGuidance"
                class="feedback-message is-guidance"
                role="status"
              >
                {{ curriculumSizeGuidance }}
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
                :class="{
                  editable: canEditCurriculum && !isSavingCurriculum,
                  dragging: draggedDraftKey === item.key,
                  'drop-target': dragTargetKey === item.key && draggedDraftKey !== item.key,
                  selected: selectedDraftItemKey === item.key,
                }"
                :style="
                  draggedDraftKey === item.key
                    ? { transform: `translateY(${dragOffsetY}px)` }
                    : undefined
                "
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
                  <small>{{ templateFor(item)?.unitName }} · {{ attemptNumber(item) }}회차</small>
                  <strong>{{ templateFor(item)?.trainingName }}</strong>
                </button>
                <div class="recommendation-actions">
                  <span v-if="item.trainingId === null" class="unsaved-label">저장 전</span>
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
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    :aria-label="`${templateFor(item)?.trainingName ?? '훈련'} 삭제`"
                    :disabled="!canEditCurriculum || isSavingCurriculum"
                    @click.stop="requestDraftDeletion(item)"
                  >
                    ×
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
            <p class="sr-only" role="status" aria-live="polite">
              {{ reorderAnnouncement }}
            </p>

            <div v-if="hasChanges" class="draft-actions">
              <span>저장되지 않은 변경 사항이 있습니다.</span>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                :disabled="!canEditCurriculum || isSavingCurriculum"
                @click="trainingStore.discardDraft"
              >
                변경 취소
              </Button>
            </div>
          </section>
        </Card>
      </div>
    </template>

    <ConfirmDialog
      :open="Boolean(draftPendingDeletion)"
      title="다음 회차에서 훈련을 삭제할까요?"
      :message="deletionMessage()"
      confirm-label="훈련 삭제"
      @cancel="draftPendingDeletion = null"
      @confirm="confirmDraftDeletion"
    />

    <LessonMaterialEditor
      v-if="materialEditorOpen && selectedTraining"
      v-model:open="materialEditorOpen"
      :training="selectedTraining"
      :attempt-label="selectedAttemptLabel"
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
  grid-template-columns: 46px 120px minmax(0, 1fr) 94px;
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
  min-height: 58px;
  padding: 10px 14px;
  border: 0;
  border-bottom: 1px solid var(--slate-200);
  background: transparent;
  color: var(--slate-700);
  text-align: left;
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
.unit-label {
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
}
.achievement {
  display: grid;
  justify-items: end;
  gap: 1px;
}
.achievement small {
  color: var(--slate-500);
  font-size: 11px;
}
.selected-training {
  padding-bottom: 10px;
}
.selected-training__identity {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 14px;
}
.selected-training__identity strong {
  color: var(--slate-900);
  font-size: 15px;
}
.selected-training__identity span {
  color: var(--slate-500);
  font-size: 11px;
}
.selected-training dl {
  display: grid;
  gap: 8px;
  margin: 17px 0 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.selected-training dl > div {
  padding: 12px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 35%, transparent);
  text-align: center;
}
.selected-training dt {
  color: var(--slate-500);
  font-size: 12px;
}
.selected-training dd {
  margin: 4px 0 0;
  color: var(--slate-900);
  font-size: 13px;
  font-weight: 700;
}
.next-session {
  margin-top: 14px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
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
.feedback-message.is-guidance {
  color: var(--primary-800);
  font-weight: 700;
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
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 25%, transparent);
  grid-template-columns: 20px 22px minmax(0, 1fr) auto;
  transition: 150ms ease;
}
.recommendation-list article.selected {
  border-color: var(--primary-300);
  background: var(--active-selection-background);
}
.recommendation-list article.editable {
  cursor: grab;
}
.recommendation-list article.editable .recommendation-copy {
  cursor: grab;
}
.recommendation-list article.dragging {
  z-index: 2;
  opacity: 0.78;
  box-shadow: var(--shadow-card);
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
  color: var(--slate-500);
  font-size: 12px;
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
.draft-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--primary-50);
  color: var(--primary-800);
  font-size: 12px;
  font-weight: 700;
}
@container (max-width: 900px) {
  .curriculum-workspace {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
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
