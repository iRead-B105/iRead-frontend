<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from 'vue-router'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SaveToast from '@/components/common/SaveToast.vue'
import LessonMaterialEditor from '@/components/teacher/LessonMaterialEditor.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import {
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
  selectedExpectedWords,
  selectedTrainingDetail,
  expectedWordsByTrainingId,
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
} = storeToRefs(trainingStore)

const draggedDraftKey = ref<string | null>(null)
const editCurriculum = ref(false)
const materialEditorOpen = ref(false)
const draftPendingDeletion = ref<CurriculumDraftItem | null>(null)
const reorderAnnouncement = ref('')
const { visible: saved, show: showSaved } = useTemporaryNotice()

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const studentId = computed(() => parseStudentId(route.params.id))
const invalidStudentId = computed(() => studentId.value === null)
const canSave = computed(
  () =>
    hasChanges.value &&
    draftItems.value.length > 0 &&
    canEditCurriculum.value &&
    curriculumStatus.value === 'success' &&
    !isSavingCurriculum.value,
)
const selectedAttemptLabel = computed(() => {
  const item = draftItems.value.find((candidate) => candidate.key === selectedDraftItemKey.value)
  return item ? attemptLabel(item) : '선택한 시행'
})

watch(
  studentId,
  async (id) => {
    materialEditorOpen.value = false
    editCurriculum.value = false
    draftPendingDeletion.value = null
    if (id === null) {
      trainingStore.reset()
      return
    }
    await trainingStore.loadForStudent(id)
  },
  { immediate: true },
)

function confirmDiscard(): boolean {
  return (
    !hasChanges.value ||
    window.confirm('저장하지 않은 커리큘럼 변경 사항을 버리고 이동할까요?')
  )
}

onBeforeRouteUpdate((to) => {
  if (parseStudentId(to.params.id) === studentId.value) return true
  return confirmDiscard()
})

onBeforeRouteLeave(() => confirmDiscard())

function achievementLabel(value: number | null): string {
  if (value === null) return '기록 없음'
  if (value >= 80) return '충분'
  if (value >= 60) return '보완 필요'
  return '우선 학습'
}

function templateFor(item: CurriculumDraftItem): TrainingCatalogItem | null {
  return (
    catalog.value.find(
      (candidate) => candidate.trainingTemplateId === item.trainingTemplateId,
    ) ?? null
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

function startDragging(key: string): void {
  if (editCurriculum.value && !isSavingCurriculum.value) draggedDraftKey.value = key
}

function dropDraftItem(targetKey: string): void {
  if (!draggedDraftKey.value) return
  trainingStore.moveDraftItem(draggedDraftKey.value, targetKey)
  draggedDraftKey.value = null
}

async function moveDraftItem(
  item: CurriculumDraftItem,
  index: number,
  direction: -1 | 1,
): Promise<void> {
  const target = draftItems.value[index + direction]
  if (!target || isSavingCurriculum.value) return

  trainingStore.moveDraftItem(item.key, target.key)
  const nextIndex = index + direction
  reorderAnnouncement.value = `${templateFor(item)?.trainingName ?? '훈련'}을(를) ${nextIndex + 1}번째로 이동했습니다.`
  await nextTick()
  document
    .getElementById(`curriculum-item-${item.key}`)
    ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    ?.focus()
}

async function selectDraftItem(item: CurriculumDraftItem): Promise<void> {
  if (studentId.value === null) return
  await trainingStore.selectDraftItem(studentId.value, item.key)
}

async function openMaterialEditor(item: CurriculumDraftItem): Promise<void> {
  if (studentId.value === null || item.trainingId === null) return
  await selectDraftItem(item)
  materialEditorOpen.value = true
}

async function requestDraftDeletion(item: CurriculumDraftItem): Promise<void> {
  if (studentId.value !== null && item.trainingId !== null) {
    await selectDraftItem(item)
  }
  draftPendingDeletion.value = item
}

function confirmDraftDeletion(): void {
  if (!draftPendingDeletion.value) return
  trainingStore.removeDraftItem(draftPendingDeletion.value.key)
  draftPendingDeletion.value = null
  materialEditorOpen.value = false
}

async function saveChanges(): Promise<void> {
  if (await trainingStore.saveCurriculum()) {
    editCurriculum.value = false
    showSaved()
  }
}

async function retryResources(): Promise<void> {
  if (studentId.value === null || selectedTrainingId.value === null) return
  await trainingStore.loadSelectedTrainingResources(
    studentId.value,
    selectedTrainingId.value,
  )
}

async function addExpectedWord(wordName: string): Promise<void> {
  await trainingStore.addExpectedWord(wordName)
}

async function deleteExpectedWord(wordId: number): Promise<void> {
  await trainingStore.deleteExpectedWord(wordId)
}

function deletionMessage(): string {
  const item = draftPendingDeletion.value
  if (!item) return ''
  const wordCount =
    item.trainingId === null
      ? 0
      : (expectedWordsByTrainingId.value[item.trainingId]?.length ?? 0)
  const warning =
    wordCount > 0
      ? ` 이 시행에 저장된 예상 단어 ${wordCount}개도 커리큘럼 저장 시 함께 제거됩니다.`
      : ''
  return `${attemptLabel(item)}을(를) 다음 회차에서 제거합니다.${warning}`
}
</script>

<template>
  <div class="curriculum page-stack">
    <PageHeader
      title="커리큘럼 관리"
      description="학습자의 다음 회차 훈련 순서와 반복 시행별 예상 단어를 관리합니다."
    >
      <template #actions>
        <SaveToast :visible="saved" inline message="커리큘럼 변경 사항이 저장되었습니다." />
        <Button type="button" :disabled="!canSave" @click="saveChanges">
          {{ isSavingCurriculum ? '저장 중...' : savedCurriculum ? '변경 사항 저장' : '커리큘럼 생성' }}
        </Button>
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
      <div
        v-if="catalogStatus === 'error' || curriculumStatus === 'error'"
        class="load-errors"
        role="alert"
      >
        <div v-if="catalogStatus === 'error'">
          <strong>전체 훈련 목록을 불러오지 못했습니다.</strong>
          <span>{{ catalogError }}</span>
        </div>
        <div v-if="curriculumStatus === 'error'">
          <strong>다음 회차 커리큘럼을 불러오지 못했습니다.</strong>
          <span>{{ curriculumError }}</span>
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
              <p>진행률이 없는 훈련은 기록 없음으로 표시합니다.</p>
            </div>
            <span>{{ catalog.length }}개 훈련</span>
          </header>

          <p v-if="catalogStatus === 'loading'" class="section-state" role="status">
            전체 훈련 목록을 불러오는 중입니다.
          </p>
          <p v-else-if="catalogStatus === 'success' && catalog.length === 0" class="section-state">
            사용할 수 있는 훈련이 없습니다.
          </p>
          <div v-else class="curriculum-table">
            <div class="curriculum-table__head">
              <span>순서</span><span>영역</span><span>훈련명</span><span>진행률</span>
            </div>
            <Button
              v-for="item in catalog"
              :key="item.trainingTemplateId"
              class="curriculum-row"
              :class="{ active: item.trainingTemplateId === selectedTemplateId }"
              type="button"
              :aria-pressed="item.trainingTemplateId === selectedTemplateId"
              @click="trainingStore.selectTemplate(item.trainingTemplateId)"
            >
              <b>{{ item.sequence }}</b>
              <span>{{ item.unitName }}</span>
              <strong>{{ item.trainingName }}</strong>
              <span class="achievement">
                <b>
                  {{
                    item.studentAchievementRate === null
                      ? '—'
                      : `${item.studentAchievementRate}%`
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
                        ? '기록 없음'
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
                        (item) =>
                          item.trainingTemplateId === selectedTemplate?.trainingTemplateId,
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
                class="edit-button"
                :class="{ active: editCurriculum }"
                :variant="editCurriculum ? 'default' : 'outline'"
                size="sm"
                type="button"
                :disabled="!canEditCurriculum || isSavingCurriculum"
                :aria-pressed="editCurriculum"
                @click="editCurriculum = !editCurriculum"
              >
                {{ editCurriculum ? '순서 편집 완료' : '순서 편집' }}
              </Button>
            </header>

            <div class="recommendation-list">
              <article
                v-for="(item, index) in draftItems"
                :id="`curriculum-item-${item.key}`"
                :key="item.key"
                :draggable="editCurriculum && !isSavingCurriculum"
                :class="{
                  editable: editCurriculum,
                  dragging: draggedDraftKey === item.key,
                  selected: selectedDraftItemKey === item.key,
                }"
                @dragstart="startDragging(item.key)"
                @dragend="draggedDraftKey = null"
                @dragover.prevent
                @drop="dropDraftItem(item.key)"
              >
                <span class="drag-handle" :class="{ enabled: editCurriculum }" aria-hidden="true"></span>
                <b class="recommendation-order">{{ index + 1 }}</b>
                <button
                  class="recommendation-copy"
                  type="button"
                  :aria-label="`${attemptLabel(item)} 선택`"
                  :aria-pressed="selectedDraftItemKey === item.key"
                  @click="selectDraftItem(item)"
                >
                  <small>{{ templateFor(item)?.unitName }} · {{ attemptNumber(item) }}회차</small>
                  <strong>{{ templateFor(item)?.trainingName }}</strong>
                </button>
                <div class="recommendation-actions">
                  <div
                    v-if="editCurriculum"
                    class="reorder-controls"
                    role="group"
                    :aria-label="`${templateFor(item)?.trainingName ?? '훈련'} 순서 변경`"
                  >
                    <Button
                      variant="outline"
                      size="icon-sm"
                      type="button"
                      :aria-label="`${templateFor(item)?.trainingName ?? '훈련'} 위로 이동`"
                      :disabled="index === 0 || isSavingCurriculum"
                      @click.stop="moveDraftItem(item, index, -1)"
                    >
                      <span aria-hidden="true">↑</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      type="button"
                      :aria-label="`${templateFor(item)?.trainingName ?? '훈련'} 아래로 이동`"
                      :disabled="index === draftItems.length - 1 || isSavingCurriculum"
                      @click.stop="moveDraftItem(item, index, 1)"
                    >
                      <span aria-hidden="true">↓</span>
                    </Button>
                  </div>
                  <span v-if="item.trainingId === null" class="unsaved-label">저장 전</span>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    :disabled="item.trainingId === null || isSavingCurriculum"
                    @click.stop="openMaterialEditor(item)"
                  >
                    예상 단어·미리보기
                  </Button>
                  <Button
                    v-if="editCurriculum"
                    class="remove-button"
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    :aria-label="`${templateFor(item)?.trainingName ?? '훈련'} 삭제`"
                    :disabled="isSavingCurriculum"
                    @click.stop="requestDraftDeletion(item)"
                  >
                    ×
                  </Button>
                </div>
              </article>
              <p v-if="curriculumStatus === 'success' && draftItems.length === 0" class="section-state">
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
                :disabled="isSavingCurriculum"
                @click="trainingStore.discardDraft"
              >
                변경 취소
              </Button>
            </div>
            <p v-if="curriculumError && curriculumStatus !== 'error'" class="inline-error" role="alert">
              {{ curriculumError }}
            </p>
            <p v-if="savedCurriculum && !canEditCurriculum" class="locked-state">
              시작되거나 완료된 커리큘럼은 수정할 수 없습니다.
            </p>
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
      :training="selectedTraining"
      :attempt-label="selectedAttemptLabel"
      :expected-words="selectedExpectedWords"
      :detail="selectedTrainingDetail"
      :expected-words-status="expectedWordsStatus"
      :detail-status="detailStatus"
      :is-mutating="isMutatingExpectedWord"
      :expected-word-error="expectedWordError"
      :detail-error="detailError"
      @close="materialEditorOpen = false"
      @add-word="addExpectedWord"
      @delete-word="deleteExpectedWord"
      @retry="retryResources"
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
.load-errors strong,
.inline-error {
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
.curriculum-table {
  overflow: auto;
  max-height: min(640px, max(240px, calc(100dvh - 250px)));
  margin: 18px 0 0;
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
.edit-button.active {
  border-color: var(--primary-600);
  background: var(--primary-600);
  color: var(--white);
}
.recommendation-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
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
.recommendation-list article.dragging {
  opacity: 0.45;
  transform: scale(0.99);
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
.reorder-controls {
  display: flex;
  gap: 4px;
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
.inline-error,
.locked-state {
  margin: 12px 0 0;
  font-size: 12px;
}
.locked-state {
  color: var(--slate-500);
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
