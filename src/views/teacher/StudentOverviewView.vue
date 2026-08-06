<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertCircle } from '@lucide/vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import LearningTrendChart from '@/components/teacher/LearningTrendChart.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import StudentCommunicationPanel from '@/components/teacher/StudentCommunicationPanel.vue'
import StudentLearningEvents from '@/components/teacher/StudentLearningEvents.vue'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import {
  normalizeTeacherMemo,
  validateTeacherMemo,
  type StudentLearningEvent,
  type StudentLearningEventType,
} from '@/features/teacher/student'
import { isApiError } from '@/lib/api'
import { useStudentStore } from '@/stores/students'


const route = useRoute()
const router = useRouter()
const studentStore = useStudentStore()
const studentId = computed(() => Number(route.params.id))
const validStudentId = computed(() => Number.isInteger(studentId.value) && studentId.value > 0)
const detail = computed(() => studentStore.detailsById[studentId.value])
const detailStatus = computed(() => studentStore.detailStatusById[studentId.value] ?? 'idle')
const detailErrorStatus = computed(
  () => studentStore.detailErrorStatusById[studentId.value] ?? null,
)

const learningEvents = computed(() => studentStore.learningEventsById[studentId.value] ?? [])
const learningEventsStatus = computed(
  () => studentStore.learningEventsStatusById[studentId.value] ?? 'idle',
)
const learningEventsError = computed(
  () => studentStore.learningEventsErrorById[studentId.value] ?? null,
)
const selectedEventId = ref<number | null>(null)
const selectedEventType = ref<StudentLearningEventType | null>(null)
const pendingEventId = ref<number | null>(null)
const pendingEventType = ref<StudentLearningEventType | null>(null)
let learningEventSelectionSequence = 0
const selectedEventKey = computed(() =>
  selectedEventId.value === null || selectedEventType.value === null
    ? null
    : studentStore.insightKey(
        studentId.value,
        `${selectedEventType.value}:${selectedEventId.value}`,
      ),
)
const selectedEventDetail = computed(() =>
  selectedEventKey.value
    ? (studentStore.learningEventDetailsByKey[selectedEventKey.value] ?? null)
    : null,
)
const selectedEventDetailStatus = computed(() =>
  selectedEventKey.value
    ? (studentStore.learningEventDetailStatusByKey[selectedEventKey.value] ?? 'idle')
    : 'idle',
)
const selectedEventDetailError = computed(() =>
  selectedEventKey.value
    ? (studentStore.learningEventDetailErrorByKey[selectedEventKey.value] ?? null)
    : null,
)
const accuracyTrendStatus = computed(
  () => studentStore.accuracyTrendStatusById[studentId.value] ?? 'idle',
)
const accuracyTrendError = computed(
  () => studentStore.accuracyTrendErrorById[studentId.value] ?? null,
)
const accuracyTrend = computed(
  () => studentStore.accuracyTrendById[studentId.value] ?? null,
)
const accuracyRecords = computed(
  () => studentStore.accuracyRecordsById[studentId.value] ?? null,
)
const readingSpeedTrendStatus = computed(
  () => studentStore.readingSpeedTrendStatusById[studentId.value] ?? 'idle',
)
const readingSpeedTrendError = computed(
  () => studentStore.readingSpeedTrendErrorById[studentId.value] ?? null,
)
const readingSpeedTrend = computed(
  () => studentStore.readingSpeedTrendById[studentId.value] ?? null,
)
const readingSpeedRecords = computed(
  () => studentStore.readingSpeedRecordsById[studentId.value] ?? null,
)
const selectedTrend = ref<'accuracy' | 'reading-speed'>('accuracy')
const recentLearningEvents = computed(() => learningEvents.value.slice(0, 4))
const eventTypeLabels: Readonly<Record<StudentLearningEventType, string>> = {
  TEST: '읽기 검사',
  TRAINING: '훈련',
  STORY: '이야기 학습',
  GAZE: '시선 분석',
}

function recordMatchesEvent(
  record: { readonly sourceType: string; readonly sourceId: number },
  event: StudentLearningEvent,
): boolean {
  return (
    record.sourceId === event.sourceId &&
    record.sourceType.toUpperCase() === event.eventType
  )
}

const accuracyChartPoints = computed(() => {
  const eventPoints = [...recentLearningEvents.value].reverse().flatMap((event) => {
    const record = accuracyRecords.value?.records.find((item) => recordMatchesEvent(item, event))
    const value = event.accuracy ?? record?.accuracy
    if (value === null || value === undefined) return []
    return [{
      date: event.occurredAt.slice(0, 10),
      label: record?.trainingName ?? eventTypeLabels[event.eventType],
      value,
    }]
  })
  if (eventPoints.length >= 2) return eventPoints

  const recordPoints = [...(accuracyRecords.value?.records ?? [])]
    .sort((left, right) => left.measuredAt.localeCompare(right.measuredAt))
    .slice(-4)
    .map((record) => ({
      date: record.measuredAt.slice(0, 10),
      label: record.trainingName,
      value: record.accuracy,
  }))
  if (recordPoints.length > 0) return recordPoints

  const trendPoints = (accuracyTrend.value?.dailyAccuracy ?? []).slice(-4).map((point) => ({
    date: point.date,
    label: '읽기 정확도',
    value: point.accuracy,
  }))
  return trendPoints.length > 0 ? trendPoints : eventPoints
})

const readingSpeedChartPoints = computed(() => {
  const eventPoints = [...recentLearningEvents.value].reverse().flatMap((event) => {
    const record = readingSpeedRecords.value?.records.find((item) =>
      recordMatchesEvent(item, event),
    )
    if (!record) return []
    return [{
      date: event.occurredAt.slice(0, 10),
      label: record.trainingName,
      value: record.speed,
    }]
  })
  if (eventPoints.length >= 2) return eventPoints

  const recordPoints = [...(readingSpeedRecords.value?.records ?? [])]
    .sort((left, right) => left.measuredAt.localeCompare(right.measuredAt))
    .slice(-4)
    .map((record) => ({
      date: record.measuredAt.slice(0, 10),
      label: record.trainingName,
      value: record.speed,
  }))
  if (recordPoints.length > 0) return recordPoints

  const trendPoints = (readingSpeedTrend.value?.points ?? []).slice(-4).map((point) => ({
    date: point.date,
    label: '읽기 속도',
    value: point.speed,
  }))
  return trendPoints.length > 0 ? trendPoints : eventPoints
})
const selectedTrendStatus = computed(() =>
  selectedTrend.value === 'accuracy' ? accuracyTrendStatus.value : readingSpeedTrendStatus.value,
)
const selectedTrendError = computed(() =>
  selectedTrend.value === 'accuracy' ? accuracyTrendError.value : readingSpeedTrendError.value,
)
const selectedTrendHasData = computed(() =>
  selectedTrend.value === 'accuracy'
    ? accuracyChartPoints.value.length > 0
    : readingSpeedChartPoints.value.length > 0,
)
const selectedTrendLoadingLabel = computed(() =>
  selectedTrend.value === 'accuracy'
    ? '정확도 추이를 불러오는 중입니다.'
    : '읽기 속도 추이를 불러오는 중입니다.',
)
const selectedTrendErrorLabel = computed(() =>
  selectedTrend.value === 'accuracy'
    ? '정확도 추이를 불러오지 못했습니다.'
    : '읽기 속도 추이를 불러오지 못했습니다.',
)
const selectedTrendEmptyLabel = computed(() =>
  selectedTrend.value === 'accuracy'
    ? '표시할 읽기 정확도 데이터가 없습니다.'
    : '표시할 읽기 속도 데이터가 없습니다.',
)
const selectedTrendPoints = computed(() =>
  selectedTrend.value === 'accuracy' ? accuracyChartPoints.value : readingSpeedChartPoints.value,
)
const selectedTrendAriaLabel = computed(() =>
  selectedTrend.value === 'accuracy'
    ? '제공된 날짜별 읽기 정확도 추이 차트'
    : '최근 30일 날짜별 읽기 속도 추이 차트',
)

const noteDraft = ref('')
const memoSaving = ref(false)
const memoError = ref('')
const { visible: memoSaved, show: showMemoSaved } = useTemporaryNotice()

const detailErrorCopy = computed(() => {
  if (!validStudentId.value) {
    return {
      title: '올바르지 않은 아동 주소입니다.',
      description: '아동 목록에서 다시 선택해 주세요.',
    }
  }
  if (detailErrorStatus.value === 403) {
    return {
      title: '이 아동을 조회할 권한이 없습니다.',
      description: '담당 아동인지 확인하거나 관리자에게 문의해 주세요.',
    }
  }
  if (detailErrorStatus.value === 404) {
    return {
      title: '아동을 찾을 수 없습니다.',
      description: '삭제되었거나 더 이상 담당하지 않는 아동일 수 있습니다.',
    }
  }
  return {
    title: '아동 정보를 불러오지 못했습니다.',
    description:
      studentStore.detailErrorById[studentId.value] ?? '연결 상태를 확인한 뒤 다시 시도해 주세요.',
  }
})

function memoErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 403) return '이 메모를 저장할 권한이 없습니다.'
    if (error.status === 404) return '아동을 찾을 수 없어 메모를 저장하지 못했습니다.'
    if (error.status === 409) return '다른 변경 사항과 충돌했습니다. 다시 시도해 주세요.'
    if (error.status >= 500 || error.status === 0) {
      return '서버 문제로 메모를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    }
    return error.message
  }
  return error instanceof Error ? error.message : '메모를 저장하지 못했습니다.'
}

async function loadOverview(nextStudentId: number): Promise<void> {
  learningEventSelectionSequence += 1
  noteDraft.value = ''
  memoError.value = ''
  selectedEventId.value = null
  selectedEventType.value = null
  pendingEventId.value = null
  pendingEventType.value = null
  selectedTrend.value = 'accuracy'
  if (!Number.isInteger(nextStudentId) || nextStudentId <= 0) return

  await Promise.all([
    studentStore.detailsById[nextStudentId] && studentStore.detailStaleById[nextStudentId] !== true
      ? Promise.resolve(studentStore.detailsById[nextStudentId])
      : studentStore.loadDetail(nextStudentId),
    studentStore.loadLearningEvents(nextStudentId, 4),
    studentStore.loadAccuracyTrend(nextStudentId),
    studentStore.loadAccuracyRecords(nextStudentId),
    studentStore.loadReadingSpeedTrend(nextStudentId),
    studentStore.loadReadingSpeedRecords(nextStudentId),
  ])
  if (studentId.value !== nextStudentId) return
  noteDraft.value = studentStore.detailsById[nextStudentId]?.teacherMemo ?? ''
}

async function selectLearningEvent(event: StudentLearningEvent): Promise<void> {
  if (selectedEventId.value === event.eventId && selectedEventType.value === event.eventType) {
    learningEventSelectionSequence += 1
    selectedEventId.value = null
    selectedEventType.value = null
    pendingEventId.value = null
    pendingEventType.value = null
    return
  }

  if (pendingEventId.value === event.eventId && pendingEventType.value === event.eventType) return

  const requestSequence = ++learningEventSelectionSequence
  const eventKey = studentStore.insightKey(studentId.value, `${event.eventType}:${event.eventId}`)
  const cachedDetail = studentStore.learningEventDetailsByKey[eventKey]
  const keepCurrentDetailVisible = selectedEventDetail.value !== null && cachedDetail === undefined

  pendingEventId.value = event.eventId
  pendingEventType.value = event.eventType

  if (!keepCurrentDetailVisible) {
    selectedEventId.value = event.eventId
    selectedEventType.value = event.eventType
  }

  const loadedDetail = await studentStore.loadLearningEvent(
    studentId.value,
    event.eventType,
    event.eventId,
  )
  if (learningEventSelectionSequence !== requestSequence) return

  pendingEventId.value = null
  pendingEventType.value = null
  if (loadedDetail !== null || studentStore.learningEventDetailStatusByKey[eventKey] === 'error') {
    selectedEventId.value = event.eventId
    selectedEventType.value = event.eventType
  }
}

async function retryLearningEvent(event: StudentLearningEvent): Promise<void> {
  await studentStore.loadLearningEvent(studentId.value, event.eventType, event.eventId)
}

function openLearningEventHistory(
  eventType: Exclude<StudentLearningEventType, 'GAZE'>,
): void {
  const routeName = {
    TRAINING: 'student-training-history',
    TEST: 'student-test-history',
    STORY: 'student-story-history',
  }[eventType]
  void router.push({ name: routeName, params: { id: studentId.value } })
}

async function retryDetail(): Promise<void> {
  if (!validStudentId.value) return
  await studentStore.loadDetail(studentId.value)
  noteDraft.value = studentStore.detailsById[studentId.value]?.teacherMemo ?? noteDraft.value
}

function retrySelectedTrend(): void {
  if (!detail.value) return
  if (selectedTrend.value === 'accuracy') {
    void studentStore.loadAccuracyTrend(detail.value.studentId)
    void studentStore.loadAccuracyRecords(detail.value.studentId)
    return
  }
  void studentStore.loadReadingSpeedTrend(detail.value.studentId)
  void studentStore.loadReadingSpeedRecords(detail.value.studentId)
}

async function saveMemo(value: string): Promise<void> {
  const validationError = validateTeacherMemo(value)
  if (validationError || !detail.value) {
    memoError.value = validationError ?? '아동 정보를 불러온 뒤 다시 시도해 주세요.'
    return
  }

  memoSaving.value = true
  memoError.value = ''
  const normalizedMemo = normalizeTeacherMemo(value)
  try {
    await studentStore.saveTeacherMemo(detail.value.studentId, normalizedMemo)
    noteDraft.value = normalizedMemo ?? ''
    showMemoSaved()
  } catch (error) {
    memoError.value = memoErrorMessage(error)
  } finally {
    memoSaving.value = false
  }
}

watch(studentId, loadOverview, { immediate: true })
</script>

<template>
  <div class="overview page-stack">
    <template v-if="!validStudentId || (detailStatus === 'error' && !detail)">
      <PageHeader title="학습 현황" />
      <section class="overview-state" role="alert">
        <AlertCircle :size="32" aria-hidden="true" />
        <h2>{{ detailErrorCopy.title }}</h2>
        <p>{{ detailErrorCopy.description }}</p>
        <div>
          <Button
            v-if="validStudentId && detailErrorStatus !== 404"
            variant="outline"
            type="button"
            @click="retryDetail"
          >
            다시 시도
          </Button>
          <Button type="button" @click="router.push({ name: 'teacher-students' })">
            아동 목록으로 이동
          </Button>
        </div>
      </section>
    </template>

    <template v-else-if="!detail">
      <PageHeader title="학습 현황" />
      <section class="overview-state" aria-live="polite">
        <span class="overview-state__spinner" aria-hidden="true" />
        <h2>아동 정보를 불러오고 있습니다.</h2>
      </section>
    </template>

    <template v-else>
      <PageHeader title="학습 현황" />

      <div class="learning-analysis">
        <aside class="recent-panel" aria-label="최근 학습 기록">
          <StudentLearningEvents
            :events="recentLearningEvents"
            :selected-event-id="selectedEventId"
            :selected-event-type="selectedEventType"
            :pending-event-id="pendingEventId"
            :pending-event-type="pendingEventType"
            :detail="selectedEventDetail"
            :list-status="learningEventsStatus"
            :list-error="learningEventsError"
            :detail-status="selectedEventDetailStatus"
            :detail-error="selectedEventDetailError"
            @select="selectLearningEvent"
            @retry-list="studentStore.loadLearningEvents(detail.studentId, 4)"
            @retry-detail="retryLearningEvent"
            @open-history="openLearningEventHistory"
          />
          <RouterLink
            class="history-link"
            :to="{ name: 'student-training-history', params: { id: detail.studentId } }"
          >
            전체 훈련 이력 보기
          </RouterLink>
        </aside>

        <Card class="trend-panel overflow-visible" :aria-labelledby="`${selectedTrend}-tab`">
          <header class="trend-heading">
            <div class="trend-tabs" role="tablist" aria-label="학습 변화 지표">
              <div
                class="trend-tabs__indicator"
                :style="{ transform: selectedTrend === 'accuracy' ? 'translateX(0)' : 'translateX(100%)' }"
                aria-hidden="true"
              />
              <button
                id="accuracy-tab"
                class="trend-tab"
                :class="{ 'is-selected': selectedTrend === 'accuracy' }"
                type="button"
                role="tab"
                aria-controls="learning-trend-panel"
                :aria-selected="selectedTrend === 'accuracy'"
                @click="selectedTrend = 'accuracy'"
              >
                읽기 정확도
              </button>
              <button
                id="reading-speed-tab"
                class="trend-tab"
                :class="{ 'is-selected': selectedTrend === 'reading-speed' }"
                type="button"
                role="tab"
                aria-controls="learning-trend-panel"
                :aria-selected="selectedTrend === 'reading-speed'"
                @click="selectedTrend = 'reading-speed'"
              >
                읽기 속도
              </button>
            </div>
            <Button
              v-if="selectedTrendStatus === 'error'"
              variant="outline"
              size="sm"
              type="button"
              @click="retrySelectedTrend"
            >
              다시 시도
            </Button>
          </header>

          <div
            id="learning-trend-panel"
            class="trend-content"
            role="tabpanel"
            :aria-labelledby="`${selectedTrend}-tab`"
          >
            <div v-if="selectedTrendStatus === 'loading'" class="insight-state" aria-live="polite">
              {{ selectedTrendLoadingLabel }}
            </div>
            <div
              v-else-if="selectedTrendStatus === 'error'"
              class="insight-state is-error"
              role="alert"
            >
              <strong>{{ selectedTrendErrorLabel }}</strong>
              <span>{{ selectedTrendError ?? '잠시 후 다시 시도해 주세요.' }}</span>
            </div>
            <div v-else-if="!selectedTrendHasData" class="insight-state">
              {{ selectedTrendEmptyLabel }}
            </div>
            <LearningTrendChart
              v-else
              :key="`${selectedTrend}:${selectedTrend === 'accuracy'
                ? accuracyChartPoints.length
                : readingSpeedChartPoints.length}`"
              :data-test="selectedTrend === 'accuracy' ? 'accuracy-chart' : 'reading-speed-chart'"
              :points="selectedTrendPoints"
              :unit="selectedTrend === 'accuracy' ? '%' : ' 단어/분'"
              :color="selectedTrend === 'accuracy' ? '#2563eb' : '#16a34a'"
              :max-value="selectedTrend === 'accuracy' ? 100 : undefined"
              :ariaLabel="selectedTrendAriaLabel"
            />
          </div>
        </Card>

      </div>

      <StudentCommunicationPanel
        v-model:note-draft="noteDraft"
        :saved-value="detail.teacherMemo"
        :busy="memoSaving"
        :error="memoError"
        :saved="memoSaved"
        @save-note="saveMemo"
      />
    </template>
  </div>
</template>

<style scoped>
.overview {
  width: 100%;
  min-width: 0;
  max-width: 1200px;
  margin: 0 auto;
  gap: 20px;
  container-type: inline-size;
}

.overview-state {
  display: grid;
  min-height: 320px;
  place-content: center;
  justify-items: center;
  gap: 10px;
  padding: 32px;
  color: var(--slate-500);
  text-align: center;
}

.overview-state h2,
.overview-state p {
  margin: 0;
}

.overview-state h2 {
  color: var(--slate-800);
  font-size: 18px;
}

.overview-state p {
  max-width: 460px;
  font-size: 13px;
}

.overview-state > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.overview-state__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--slate-200);
  border-top-color: var(--primary-600);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}


.learning-analysis {
  display: grid;
  align-items: stretch;
  gap: 24px;
  grid-template-columns: minmax(320px, 0.75fr) minmax(0, 1.45fr);
}

.trend-panel {
  display: grid;
  min-width: 0;
  gap: 0;
  padding: 20px;
  border-radius: var(--radius-lg);
  overflow: visible !important;
}

.trend-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -4px 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.trend-tabs {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 3px;
  background: var(--slate-100, #f1f5f9);
  border: 1px solid var(--slate-200, #e2e8f0);
  border-radius: 9999px;
}

.trend-tabs__indicator {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(50% - 3px);
  height: calc(100% - 6px);
  border-radius: 9999px;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.06);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.trend-tab {
  position: relative;
  z-index: 1;
  min-height: 32px;
  padding: 0 16px;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: var(--slate-600, #475569);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease;
  user-select: none;
}

.trend-tab:hover {
  color: var(--slate-900, #0f172a);
}

.trend-tab.is-selected {
  color: var(--primary-700, #1d4ed8);
  font-weight: 700;
}

.trend-tab:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}

.trend-heading > :deep([data-slot='button']) {
  margin-bottom: 8px;
}

.trend-content {
  position: relative;
  min-height: 250px;
  overflow: visible;
}

.recent-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow-sm);
}

.insight-state {
  display: grid;
  min-height: 112px;
  place-content: center;
  justify-items: center;
  gap: 7px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--slate-500);
  font-size: 12px;
  text-align: center;
}

.insight-state.is-error {
  border-color: color-mix(in oklch, var(--danger-600) 30%, var(--border));
  background: #fff1f2;
  color: var(--danger-600);
}

.history-link {
  display: inline-flex;
  width: 100%;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  color: var(--primary-700);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.history-link:hover {
  text-decoration: underline;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@container (max-width: 940px) {
  .learning-analysis {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .learning-summary-section > header {
    align-items: flex-start;
    grid-template-columns: 1fr;
  }

  .trend-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .trend-heading > :deep([data-slot='button']) {
    align-self: flex-start;
  }

  .overview-state {
    min-height: 240px;
    padding: 24px 16px;
  }

  .overview-state > div {
    justify-content: center;
  }

  .trend-panel {
    padding: 16px;
  }
}
</style>
