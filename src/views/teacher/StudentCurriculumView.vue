<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SaveToast from '@/components/common/SaveToast.vue'
import LessonMaterialEditor from '@/components/teacher/LessonMaterialEditor.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import type { CurriculumItem, RecommendedCurriculumItem } from '@/features/teacher/types'
import { trainingApi } from '@/features/teacher/adminApi'

const route = useRoute()
const studentId = computed(() => Number(route.params.id) || 1)
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const curriculumItems = ref<CurriculumItem[]>([])
const currentCurriculumId = ref<number>()
const selectedItemId = ref(1)
const editingRecommendationId = ref<number>()
const editingItem = ref<CurriculumItem>()
const editRecommendations = ref(false)
const hasChanges = ref(false)
const recommendations = ref<RecommendedCurriculumItem[]>([])
const draggedRecommendationId = ref<number>()
const recommendationPendingDeletion = ref<RecommendedCurriculumItem>()
const nextRecommendationId = ref(Math.max(0, ...recommendations.value.map((item) => item.id)) + 1)
const { visible: saved, show: showSaved } = useTemporaryNotice()

async function loadStudentCurriculum(id: number) {
  const catalog = await trainingApi.catalog(id)
  curriculumItems.value = catalog.map((item) => ({
    id: item.trainingId,
    studentId: id,
    category: item.category,
    order: item.sequence,
    title: item.trainingName,
    achievement: Number(item.studentAchievement ?? 0),
    material: {
      duration: 15,
      objective: '',
      teacherGuide: '',
      childInstruction: '',
      contentItems: [],
      updatedAt: '',
    },
  }))
  recommendations.value = []
  currentCurriculumId.value = undefined
  try {
    const currentCurriculum = await trainingApi.currentCurriculum(id)
    currentCurriculumId.value = currentCurriculum.curriculumId
    for (const training of currentCurriculum.trainings) {
      const item = curriculumItems.value.find(
        (candidate) => candidate.id === training.trainingTemplateId,
      )
      if (!item) continue
      const existing = recommendations.value.find(
        (recommendation) => recommendation.trainingId === item.id,
      )
      if (existing) {
        existing.count += 1
        continue
      }
      recommendations.value.push({
        id: recommendations.value.length + 1,
        trainingId: item.id,
        category: item.category,
        title: item.title,
        count: 1,
        material: clone(item.material),
      })
    }
  } catch {
    currentCurriculumId.value = undefined
  }
  selectedItemId.value = curriculumItems.value[0]?.id ?? 1
  editingRecommendationId.value = undefined
  editingItem.value = undefined
  editRecommendations.value = false
  hasChanges.value = false
  nextRecommendationId.value = Math.max(0, ...recommendations.value.map((item) => item.id)) + 1
}

watch(studentId, loadStudentCurriculum, { immediate: true })

const selectedItem = computed(() =>
  curriculumItems.value.find((item) => item.id === selectedItemId.value),
)
const selectedStatus = computed(() =>
  selectedItem.value ? getAchievementStatus(selectedItem.value.achievement) : '',
)
const selectedRecommendation = computed(() =>
  recommendations.value.find((item) => item.trainingId === selectedItem.value?.id),
)

function getAchievementStatus(achievement: number) {
  if (achievement >= 80) return '충분'
  if (achievement >= 60) return '보완 필요'
  return '우선 학습'
}

function startDragging(id: number) {
  if (editRecommendations.value) draggedRecommendationId.value = id
}

function dropRecommendation(targetId: number) {
  const draggedId = draggedRecommendationId.value
  if (!editRecommendations.value || draggedId === undefined || draggedId === targetId) return
  const from = recommendations.value.findIndex((item) => item.id === draggedId)
  const to = recommendations.value.findIndex((item) => item.id === targetId)
  if (from < 0 || to < 0) return
  const [moved] = recommendations.value.splice(from, 1)
  if (moved) recommendations.value.splice(to, 0, moved)
  draggedRecommendationId.value = undefined
  hasChanges.value = true
}

function updateCount(item: RecommendedCurriculumItem, amount: number) {
  const nextCount = Math.max(1, item.count + amount)
  if (nextCount === item.count) return
  item.count = nextCount
  hasChanges.value = true
}

function deleteRecommendation() {
  if (!recommendationPendingDeletion.value) return
  recommendations.value = recommendations.value.filter(
    (item) => item.id !== recommendationPendingDeletion.value?.id,
  )
  recommendationPendingDeletion.value = undefined
  hasChanges.value = true
}

function addSelectedTraining() {
  const training = selectedItem.value
  if (!training) return
  const existing = recommendations.value.find((item) => item.trainingId === training.id)
  if (existing) {
    existing.count += 1
    hasChanges.value = true
    return
  }
  recommendations.value.push({
    id: nextRecommendationId.value++,
    trainingId: training.id,
    category: training.category,
    title: training.title,
    count: 1,
    material: clone(training.material),
  })
  hasChanges.value = true
}

function openRecommendationMaterial(item: RecommendedCurriculumItem) {
  const source = curriculumItems.value.find((entry) => entry.id === item.trainingId)
  if (!source) return

  editingRecommendationId.value = item.id
  editingItem.value = {
    ...clone(source),
    category: item.category,
    title: item.title,
    material: clone(item.material ?? source.material),
  }
}

function closeLessonMaterial() {
  editingRecommendationId.value = undefined
  editingItem.value = undefined
}

async function saveChanges() {
  if (!hasChanges.value || currentCurriculumId.value === undefined) return
  const trainingTemplateIds = recommendations.value.flatMap((item) =>
    Array.from({ length: item.count }, () => item.trainingId),
  )
  await trainingApi.updateCurriculum(
    studentId.value,
    currentCurriculumId.value,
    trainingTemplateIds,
  )
  hasChanges.value = false
  editRecommendations.value = false
  showSaved()
}

function saveLessonMaterial(item: CurriculumItem) {
  const recommendation = recommendations.value.find(
    (entry) => entry.id === editingRecommendationId.value,
  )
  if (!recommendation) return

  recommendation.category = item.category
  recommendation.title = item.title
  recommendation.material = clone(item.material)
  editingRecommendationId.value = undefined
  editingItem.value = undefined
  showSaved()
}
</script>

<template>
  <div class="curriculum page-stack">
    <PageHeader
      title="커리큘럼 관리"
      description="AI가 개인화한 훈련 순서와 아동별 교안 내용을 관리합니다."
    >
      <template #actions>
        <SaveToast :visible="saved" inline message="교안 및 커리큘럼 변경 사항이 저장되었습니다." />
        <Button type="button" :disabled="!hasChanges" @click="saveChanges">
          변경 사항 저장
        </Button>
      </template>
    </PageHeader>

    <div class="curriculum-workspace">
      <Card class="curriculum-library">
        <header class="section-heading">
          <div>
            <h2>전체 훈련 목록</h2>
          </div>
          <span>{{ curriculumItems.length }}개 훈련</span>
        </header>

        <div class="curriculum-table">
          <div class="curriculum-table__head">
            <span>순서</span><span>카테고리</span><span>훈련명</span><span>달성 상태</span>
          </div>
          <Button
            v-for="item in curriculumItems"
            :key="item.id"
            class="curriculum-row"
            :class="{ active: item.id === selectedItemId }"
            type="button"
            @click="selectedItemId = item.id"
          >
            <b>{{ item.order }}</b>
            <span>{{ item.category }}</span>
            <strong>{{ item.title }}</strong>
            <span class="achievement">
              <b>{{ item.achievement }}%</b>
              <small>{{ getAchievementStatus(item.achievement) }}</small>
            </span>
          </Button>
        </div>
      </Card>

      <Card class="curriculum-panel">
        <section class="selected-training">
          <header class="section-heading">
            <h2>선택한 훈련</h2>
          </header>
          <div class="selected-training__identity">
            <strong>{{ selectedItem?.title }}</strong>
            <span>{{ selectedItem?.category }} · {{ selectedItem?.order }}단계</span>
          </div>

          <dl>
            <div>
              <dt>현재 정확도</dt>
              <dd>{{ selectedItem?.achievement }}%</dd>
            </div>
            <div>
              <dt>학습 판단</dt>
              <dd>{{ selectedStatus }}</dd>
            </div>
            <div>
              <dt>권장 시간</dt>
              <dd>{{ selectedItem?.material.duration }}분</dd>
            </div>
          </dl>

          <Card class="material-access-card">
            <p>{{ selectedItem?.material.objective }}</p>
          </Card>

          <div class="selected-training__actions">
            <Button variant="outline" type="button" @click="addSelectedTraining">
              {{ selectedRecommendation ? '수업 횟수 1회 추가' : '다음 회차에 추가' }}
            </Button>
            <span v-if="selectedRecommendation" class="inclusion-note">
              현재 {{ selectedRecommendation.count }}회 포함됨
            </span>
          </div>
        </section>

        <section class="next-session">
          <header class="section-heading next-session__heading">
            <div>
              <div class="title-line">
                <h2>다음 회차 순서</h2>
              </div>
              <p>
                {{
                  editRecommendations
                    ? '핸들을 끌어 순서를 바꾸고 횟수를 조절하세요.'
                    : `${recommendations.length}개 훈련이 예정되어 있습니다.`
                }}
              </p>
            </div>
            <Button
              class="edit-button"
              :class="{ active: editRecommendations }"
              :variant="editRecommendations ? 'default' : 'outline'"
              size="sm"
              type="button"
              :aria-pressed="editRecommendations"
              @click="editRecommendations = !editRecommendations"
            >
              <svg v-if="editRecommendations" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <path d="m4 16-.5 4.5L8 20l11-11-4-4L4 16Z" />
                <path d="m13.5 6.5 4 4" />
              </svg>
              <span>{{ editRecommendations ? '수정 완료' : '수정' }}</span>
            </Button>
          </header>

          <div class="recommendation-list">
            <article
              v-for="(item, index) in recommendations"
              :key="item.id"
              :draggable="editRecommendations"
              :class="{
                editable: editRecommendations,
                dragging: draggedRecommendationId === item.id,
              }"
              @dragstart="startDragging(item.id)"
              @dragend="draggedRecommendationId = undefined"
              @dragover.prevent
              @drop="dropRecommendation(item.id)"
            >
              <span
                class="drag-handle"
                :class="{ enabled: editRecommendations }"
                :title="editRecommendations ? '끌어서 순서 변경' : '수정 모드에서 순서 변경'"
                aria-hidden="true"
              ></span>
              <b class="recommendation-order">{{ index + 1 }}</b>
              <div class="recommendation-copy">
                <small>{{ item.category }}</small>
                <strong>{{ item.title }}</strong>
              </div>
              <div v-if="editRecommendations" class="recommendation-actions">
                <div class="count-control" aria-label="시행 횟수 조절">
                  <Button variant="outline" size="icon-sm" type="button" aria-label="횟수 줄이기" @click="updateCount(item, -1)">
                    −
                  </Button>
                  <b>{{ item.count }}회</b>
                  <Button variant="outline" size="icon-sm" type="button" aria-label="횟수 늘리기" @click="updateCount(item, 1)">
                    ＋
                  </Button>
                </div>
                <Button
                  class="recommendation-material-button"
                  variant="outline"
                  size="sm"
                  type="button"
                  draggable="false"
                  @click.stop="openRecommendationMaterial(item)"
                >
                  교안 편집
                </Button>
                <Button
                  class="remove-button"
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  draggable="false"
                  :aria-label="`${item.title} 삭제`"
                  @click.stop="recommendationPendingDeletion = item"
                >
                  ×
                </Button>
              </div>
              <span v-else class="count-label">{{ item.count }}회</span>
            </article>
            <p v-if="recommendations.length === 0" class="empty-recommendations">
              선택한 훈련에서 다음 회차에 진행할 훈련을 추가해 주세요.
            </p>
          </div>
        </section>
      </Card>
    </div>

    <ConfirmDialog
      :open="Boolean(recommendationPendingDeletion)"
      title="추천 커리큘럼에서 삭제할까요?"
      :message="`${recommendationPendingDeletion?.title ?? ''} 훈련을 다음 회차에서 제거합니다.`"
      confirm-label="훈련 삭제"
      @cancel="recommendationPendingDeletion = undefined"
      @confirm="deleteRecommendation"
    />

    <LessonMaterialEditor
      v-if="editingItem"
      :item="editingItem"
      @cancel="closeLessonMaterial"
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
.curriculum-workspace {
  display: grid;
  align-items: stretch;
  gap: 20px;
  grid-template-columns: minmax(0, 1.08fr) minmax(390px, 0.92fr);
}
.curriculum-library {
  height: 100%;
  min-width: 0;
  gap: 0;
  padding: 20px;
  border-radius: var(--radius-lg);
}
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
.curriculum-table {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: min(640px, calc(100vh - 250px));
  margin: 18px 0 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.curriculum-table__head,
.curriculum-row {
  display: grid;
  align-items: center;
  gap: 12px;
  grid-template-columns: 46px 140px minmax(0, 1fr) 94px;
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
.curriculum-row > span:not(.achievement) {
  min-width: 0;
  overflow-wrap: anywhere;
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
.curriculum-row.active::before {
  background: var(--primary-600);
}
.curriculum-row.active {
  background: var(--active-selection-background);
  color: var(--active-selection-foreground);
}
.curriculum-row.active strong {
  color: var(--active-selection-foreground);
}
.achievement {
  display: grid;
  justify-items: end;
  gap: 1px;
}
.achievement b {
  color: var(--slate-800);
  font-size: 13px;
}
.achievement small {
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 500;
}
.selected-training {
  padding-bottom: 10px;
}
.selected-training__identity {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 10px;
  margin-top: 12px;
  white-space: nowrap;
}
.selected-training__identity strong {
  overflow: hidden;
  color: var(--slate-900);
  font-size: 15px;
  text-overflow: ellipsis;
}
.selected-training__identity span {
  flex: 0 0 auto;
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
  font-size: 14px;
  font-weight: 700;
}
.material-access-card {
  margin: 4px 0 15px;
  padding: 12px 14px;
  border-color: color-mix(in oklch, var(--primary-600) 24%, var(--border));
  border-left: 3px solid var(--primary-600);
  background: var(--active-selection-background);
}
.material-access-card > p {
  margin: 0;
  color: var(--active-selection-foreground);
  font-size: 11px;
  line-height: 1.55;
}
.selected-training .button {
  min-height: 36px;
}
.selected-training__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.inclusion-note {
  color: var(--slate-500);
  font-size: 12px;
}
.next-session {
  margin-top: 14px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.title-line {
  display: flex;
  align-items: center;
  gap: 9px;
}
.edit-button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid var(--slate-300);
  border-radius: 7px;
  background: var(--white);
  color: var(--primary-700);
  font-size: 12px;
  font-weight: 700;
}
.edit-button:hover,
.edit-button:focus-visible {
  border-color: var(--primary-400);
  background: var(--primary-50);
}
.edit-button:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
.edit-button.active {
  border-color: var(--primary-600);
  background: var(--primary-600);
  color: var(--white);
}
.edit-button svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}
.recommendation-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.recommendation-list article {
  display: grid;
  min-height: 58px;
  align-items: center;
  gap: 8px;
  padding: 10px 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 25%, transparent);
  grid-template-columns: 20px 22px minmax(0, 1fr) auto;
  transition: 150ms ease;
}
.recommendation-list article.editable {
  cursor: grab;
}
.recommendation-list article.editable:hover {
  border-color: color-mix(in oklch, var(--primary) 35%, var(--border));
  background: var(--interactive-hover-background);
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
.recommendation-copy small {
  margin-bottom: 2px;
  color: var(--slate-500);
  font-size: 12px;
}
.recommendation-copy strong {
  color: var(--slate-800);
  font-size: 13px;
}
.count-label {
  color: var(--slate-600);
  font-size: 12px;
  font-weight: 700;
}
.recommendation-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: default;
}
.count-control {
  display: flex;
  align-items: center;
  gap: 6px;
}
.count-control button {
  width: 26px;
  height: 26px;
  border: 1px solid var(--slate-300);
  border-radius: 5px;
  background: var(--white);
  color: var(--slate-700);
}
.count-control b {
  min-width: 30px;
  font-size: 12px;
  text-align: center;
}
.recommendation-material-button {
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid var(--primary-200);
  border-radius: 6px;
  background: var(--white);
  color: var(--primary-700);
  font-size: 10px;
  font-weight: 800;
}
.recommendation-material-button:hover,
.recommendation-material-button:focus-visible {
  border-color: var(--primary-500);
  background: var(--primary-50);
}
.remove-button {
  width: 26px;
  height: 26px;
  border: 0;
  background: transparent;
  color: var(--slate-400);
  font-size: 20px;
  font-weight: 700;
  opacity: 0.52;
  transition:
    color 150ms ease,
    opacity 150ms ease;
}
.remove-button:hover,
.remove-button:focus-visible {
  color: var(--danger-600);
  opacity: 1;
}
.empty-recommendations {
  margin: 0;
  padding: 24px 0;
  color: var(--slate-500);
  font-size: 12px;
  text-align: center;
}
.curriculum .button:disabled {
  border-color: var(--slate-200);
  background: var(--slate-100);
  box-shadow: none;
  color: var(--slate-400);
  cursor: default;
  opacity: 1;
  transform: none;
}

@container (max-width: 850px) {
  .curriculum-workspace {
    grid-template-columns: 1fr;
  }
  .curriculum-panel {
    padding: 20px;
  }
}
</style>
            variant="ghost"
