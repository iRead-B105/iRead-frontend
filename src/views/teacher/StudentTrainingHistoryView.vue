<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import {
  BarChart3Icon,
  CalendarDaysIcon,
  ChevronRightIcon,
  Clock3Icon,
  InfoIcon,
} from '@lucide/vue'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import GazeAnalysisPanel from '@/components/teacher/GazeAnalysisPanel.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { asyncStateKind } from '@/features/teacher/error'
import {
  formatTrainingDuration,
  formatTrainingQuestionAnswer,
  formatTrainingQuestionContent,
  trainingQuestionTypeLabel,
  type CurriculumLog,
  type CurriculumTrainingLogItem,
  type TrainingPeriod,
  type TrainingHistoryQuestionResult,
} from '@/features/teacher/training'
import type { GazeAnalysisState } from '@/features/teacher/gaze'
import { useTrainingStore } from '@/stores/training'

const route = useRoute()
const router = useRouter()
const trainingStore = useTrainingStore()
const {
  period,
  curriculumLogs,
  selectedCurriculumId,
  trainingLog,
  selectedHistoryTrainingId,
  historyTrainingDetail,
  historyGazeAnalysis,
  curriculumLogsStatus,
  trainingLogStatus,
  historyDetailStatus,
  historyGazeStatus,
  curriculumLogsError,
  curriculumLogsUiError,
  trainingLogError,
  historyDetailError,
  historyGazeError,
} = storeToRefs(trainingStore)
const curriculumLogsErrorKind = computed(() => asyncStateKind(curriculumLogsUiError.value))
const CURRICULUM_PAGE_SIZE = 5
const curriculumPage = ref(1)

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const studentId = computed(() => parseStudentId(route.params.id))
const requestedTrainingId = computed(() => parseStudentId(route.query.trainingId))
const invalidStudentId = computed(() => studentId.value === null)
const selectedHistoryTraining = computed(
  () =>
    trainingLog.value?.trainings.find(
      (training) => training.trainingId === selectedHistoryTrainingId.value,
    ) ?? null,
)
const detailQuestions = computed(() => selectedHistoryTraining.value?.questions ?? [])
const questionSummary = computed(() => ({
  total: detailQuestions.value.length,
  correct: detailQuestions.value.filter((question) => question.correct === true).length,
  incorrect: detailQuestions.value.filter((question) => question.correct === false).length,
  ungraded: detailQuestions.value.filter((question) => question.correct === null).length,
}))
const historyGazeAggregate = computed<GazeAnalysisState | null>(() => {
  const state = historyGazeAnalysis.value
  if (state?.status !== 'AVAILABLE') return state
  return {
    ...state,
    analysis: {
      ...state.analysis,
      replay: null,
    },
  }
})
const curriculumPageCount = computed(() =>
  Math.max(1, Math.ceil(curriculumLogs.value.length / CURRICULUM_PAGE_SIZE)),
)
const paginatedCurriculumLogs = computed(() => {
  const start = (curriculumPage.value - 1) * CURRICULUM_PAGE_SIZE
  return curriculumLogs.value.slice(start, start + CURRICULUM_PAGE_SIZE)
})
const curriculumGroups = computed(() => {
  const groups = new Map<string, { label: string; items: CurriculumLog[] }>()

  paginatedCurriculumLogs.value.forEach((curriculum) => {
    const match = /^(\d{4})-(\d{2})/.exec(curriculum.date)
    const key = match ? `${match[1]}-${match[2]}` : 'unknown'
    const label = match ? `${match[1]}년 ${Number(match[2])}월` : '날짜 미확인'
    const group = groups.get(key) ?? { label, items: [] }
    group.items.push(curriculum)
    groups.set(key, group)
  })

  return [...groups.entries()].map(([key, group]) => ({ key, ...group }))
})
watch(curriculumPageCount, (pageCount) => {
  if (curriculumPage.value > pageCount) curriculumPage.value = pageCount
})
watch(
  [studentId, requestedTrainingId],
  async ([id, trainingId]) => {
    if (id === null) {
      trainingStore.reset()
      return
    }
    await trainingStore.loadHistoryForStudent(id)
    if (trainingId === null) return
    const curriculum = curriculumLogs.value.find((item) =>
      item.trainings.some((training) => training.trainingId === trainingId),
    )
    if (!curriculum) return
    await trainingStore.selectHistoryCurriculum(id, curriculum.curriculumId)
    const training = trainingLog.value?.trainings.find((item) => item.trainingId === trainingId)
    if (training) await trainingStore.selectHistoryTraining(id, training.trainingId)
  },
  { immediate: true },
)

async function changePeriod(event: Event): Promise<void> {
  if (studentId.value === null) return
  const value = (event.target as HTMLSelectElement).value
  if (value !== '30d' && value !== '3m') return
  curriculumPage.value = 1
  await trainingStore.setHistoryPeriod(studentId.value, value as TrainingPeriod)
}

async function selectCurriculum(curriculum: CurriculumLog): Promise<void> {
  if (studentId.value === null) return
  await trainingStore.selectHistoryCurriculum(studentId.value, curriculum.curriculumId)
}

async function selectTraining(training: CurriculumTrainingLogItem): Promise<void> {
  if (studentId.value === null) return
  await trainingStore.selectHistoryTraining(studentId.value, training.trainingId)
}

async function retrySelectedCurriculum(): Promise<void> {
  if (studentId.value === null || selectedCurriculumId.value === null) return
  await trainingStore.selectHistoryCurriculum(studentId.value, selectedCurriculumId.value)
}

async function retryDetail(): Promise<void> {
  if (studentId.value === null || selectedHistoryTrainingId.value === null) return
  await trainingStore.loadHistoryTrainingDetail(studentId.value, selectedHistoryTrainingId.value)
}


function formatDate(value: string | null): string {
  if (!value) return '-'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return '-'
  return `${match[1]}.${match[2]}.${match[3]}`
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function formatAccuracy(value: number | null): string {
  return value === null ? '기록 없음' : `${value}%`
}

function hasSubmittedAnswer(question: TrainingHistoryQuestionResult): boolean {
  return question.selectedAnswer !== null || question.correct !== null || question.score !== null
}

function questionStatus(question: TrainingHistoryQuestionResult): string {
  if (question.correct === null) {
    return hasSubmittedAnswer(question) ? '채점 대상 아님' : '미제출'
  }
  return question.correct ? '정답' : '오답'
}

function questionStatusClass(question: TrainingHistoryQuestionResult): string {
  if (question.correct === null) return 'is-ungraded'
  return question.correct ? 'is-correct' : 'is-incorrect'
}

function selectedAnswerDetail(question: TrainingHistoryQuestionResult): string {
  if (question.responseType === 'AUDIO') {
    return hasSubmittedAnswer(question) ? '음성 응답 완료' : '미제출'
  }
  const formatted = formatTrainingQuestionAnswer(
    question.selectedAnswer,
    question.responseType,
    question.question,
  )
  if (formatted) return formatted
  return hasSubmittedAnswer(question) ? '응답 데이터 없음' : '미제출'
}

function correctAnswerDetail(question: TrainingHistoryQuestionResult): string {
  return (
    formatTrainingQuestionAnswer(
      question.correctAnswer,
      question.responseType,
      question.question,
    ) ?? '정답 정보 없음'
  )
}

function formatQuestionScore(score: number | null): string | null {
  if (score === null) return null
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(score)}점`
}
</script>

<template>
  <div class="training-history page-stack">
    <PageHeader title="학습 이력" />

    <AsyncStatePanel
      v-if="invalidStudentId"
      kind="not-found"
      title="올바른 학습자를 선택해 주세요."
      message="학습 이력을 조회하려면 학습자 목록에서 대상을 다시 선택해야 합니다."
      action-label="학습자 목록으로 이동"
      @action="router.push({ name: 'teacher-students' })"
    />

    <template v-else>
      <Card
        v-if="curriculumLogsStatus === 'success' && curriculumLogs.length === 0"
        class="history-empty-card"
        data-test="history-empty-card"
      >
        <AsyncStatePanel
          kind="empty"
          title="완료된 학습 이력이 없습니다"
          message="선택한 기간에 완료된 커리큘럼과 훈련이 없습니다."
        />
      </Card>

      <div v-else class="history-workspace">
        <div class="history-summary-grid">
          <Card class="curriculum-browser" data-test="history-selection-card">
            <header class="section-heading curriculum-browser__heading">
              <h2>완료한 커리큘럼</h2>
              <div class="period-field">
                <select
                  id="training-period"
                  aria-label="조회 기간"
                  :value="period"
                  :disabled="curriculumLogsStatus === 'loading'"
                  @change="changePeriod"
                >
                  <option value="30d">최근 30일</option>
                  <option value="3m">최근 3개월</option>
                </select>
              </div>
            </header>

            <AsyncStatePanel
              v-if="curriculumLogsStatus === 'loading' && curriculumLogs.length === 0"
              kind="loading"
              message="완료된 커리큘럼을 불러오는 중입니다."
              compact
            />
            <AsyncStatePanel
              v-else-if="curriculumLogsStatus === 'error' && curriculumLogs.length === 0"
              :kind="curriculumLogsErrorKind"
              title="완료된 커리큘럼을 불러오지 못했습니다"
              :message="curriculumLogsError ?? '잠시 후 다시 시도해 주세요.'"
              :retry-label="curriculumLogsUiError?.retryable ? '다시 불러오기' : undefined"
              compact
              @retry="trainingStore.retryHistory()"
            />
            <div v-else class="curriculum-groups">
              <AsyncStatePanel
                v-if="curriculumLogsStatus === 'error'"
                :kind="curriculumLogsErrorKind"
                title="최신 이력을 불러오지 못했습니다"
                :message="`${curriculumLogsError ?? '잠시 후 다시 시도해 주세요.'} 이전 이력을 계속 표시합니다.`"
                :retry-label="curriculumLogsUiError?.retryable ? '다시 불러오기' : undefined"
                compact
                @retry="trainingStore.retryHistory()"
              />
              <AsyncStatePanel
                v-else-if="curriculumLogsStatus === 'loading'"
                kind="loading"
                message="최신 이력을 확인하는 동안 이전 이력을 표시합니다."
                compact
              />
              <section v-for="group in curriculumGroups" :key="group.key" class="curriculum-group">
                <h3>{{ group.label }}</h3>
                <div class="curriculum-list">
                  <Button
                    v-for="curriculum in group.items"
                    :key="curriculum.curriculumId"
                    variant="ghost"
                    type="button"
                    class="curriculum-row"
                    :class="{ active: curriculum.curriculumId === selectedCurriculumId }"
                    :aria-pressed="curriculum.curriculumId === selectedCurriculumId"
                    @click="selectCurriculum(curriculum)"
                  >
                    <span class="curriculum-row__icon"><CalendarDaysIcon aria-hidden="true" /></span>
                    <strong>{{ formatDate(curriculum.date) }}</strong>
                    <span class="curriculum-row__accuracy">
                      <small>평균 정확도</small>
                      <b>{{ formatAccuracy(curriculum.achievement) }}</b>
                    </span>
                    <ChevronRightIcon class="curriculum-row__chevron" aria-hidden="true" />
                  </Button>
                </div>
              </section>
            </div>
            <nav
              v-if="curriculumLogs.length > 0 && curriculumPageCount > 1"
              class="curriculum-pagination"
              aria-label="완료 커리큘럼 페이지"
            >
              <Button
                variant="outline"
                size="sm"
                type="button"
                :disabled="curriculumPage === 1"
                @click="curriculumPage -= 1"
              >
                이전
              </Button>
              <span>{{ curriculumPage }} / {{ curriculumPageCount }}</span>
              <Button
                variant="outline"
                size="sm"
                type="button"
                :disabled="curriculumPage === curriculumPageCount"
                @click="curriculumPage += 1"
              >
                다음
              </Button>
            </nav>
          </Card>

          <Card class="curriculum-overview">
            <section class="curriculum-trainings">
              <h3>학습 목록</h3>
              <AsyncStatePanel
                v-if="trainingLogStatus === 'loading'"
                kind="loading"
                message="학습 목록을 불러오는 중입니다."
                compact
              />
              <AsyncStatePanel
                v-else-if="trainingLogStatus === 'error'"
                kind="error"
                title="학습 목록을 불러오지 못했습니다"
                :message="trainingLogError ?? '잠시 후 다시 시도해 주세요.'"
                retry-label="다시 불러오기"
                compact
                @retry="retrySelectedCurriculum"
              />
              <AsyncStatePanel
                v-else-if="!trainingLog?.trainings.length"
                kind="empty"
                message="선택한 커리큘럼에 표시할 훈련이 없습니다."
                compact
              />
              <div v-else class="training-list">
                <Button
                  v-for="(training, index) in trainingLog.trainings"
                  :key="training.trainingId"
                  variant="ghost"
                  type="button"
                  class="training-row"
                  :class="{ active: training.trainingId === selectedHistoryTrainingId }"
                  :aria-pressed="training.trainingId === selectedHistoryTrainingId"
                  @click="selectTraining(training)"
                >
                  <span class="sequence">{{ index + 1 }}</span>
                  <span class="training-name">
                    <strong>{{ training.trainingName }}</strong>
                    <small>
                      <Clock3Icon aria-hidden="true" />
                      {{ formatDateTime(training.finishedAt ?? training.startedAt) }}
                    </small>
                  </span>
                  <span class="training-accuracy__icon"><BarChart3Icon aria-hidden="true" /></span>
                  <span class="training-row__accuracy">
                    <small>훈련 정확도</small>
                    <b>{{ formatAccuracy(training.accuracy) }}</b>
                  </span>
                </Button>
              </div>
              <p v-if="trainingLog?.trainings.length" class="curriculum-complete-note">
                <InfoIcon aria-hidden="true" />
                모든 훈련을 완료했습니다. 훈련을 선택하면 상세 학습 결과를 확인할 수 있습니다.
              </p>
            </section>
          </Card>
        </div>

        <Card class="detail-card">
          <header class="detail-heading">
            <div>
              <span>선택 훈련 상세</span>
              <template v-if="historyDetailStatus === 'success' && historyTrainingDetail">
                <h2>{{ historyTrainingDetail.name }}</h2>
              </template>
              <template v-else>
                <h2>{{ selectedHistoryTraining?.trainingName ?? '훈련을 선택해 주세요.' }}</h2>
                <p v-if="historyDetailStatus === 'loading'">새 훈련 상세를 불러오는 중입니다.</p>
                <p v-else-if="historyDetailStatus === 'error'">상세 조회를 완료하지 못했습니다.</p>
              </template>
            </div>
          </header>

          <div class="detail-content-shell" :aria-busy="historyDetailStatus === 'loading'">
            <AsyncStatePanel
              v-if="historyDetailStatus === 'loading'"
              kind="loading"
              message="훈련 상세를 불러오는 중입니다."
              compact
            />
            <AsyncStatePanel
              v-else-if="historyDetailStatus === 'error'"
              kind="error"
              title="훈련 상세를 불러오지 못했습니다"
              :message="historyDetailError ?? '잠시 후 다시 시도해 주세요.'"
              retry-label="상세 다시 불러오기"
              compact
              @retry="retryDetail"
            />
            <AsyncStatePanel
              v-else-if="!historyTrainingDetail"
              kind="empty"
              message="상세를 확인할 훈련을 선택해 주세요."
              compact
            />
            <template v-else>
              <dl class="detail-metrics">
                <div>
                  <dt>시작 시각</dt>
                  <dd>{{ formatDateTime(historyTrainingDetail.startedAt) }}</dd>
                </div>
                <div>
                  <dt>완료 시각</dt>
                  <dd>{{ formatDateTime(historyTrainingDetail.finishedAt) }}</dd>
                </div>
                <div>
                  <dt>전체 학습 시간</dt>
                  <dd>
                    {{
                      formatTrainingDuration(
                        historyTrainingDetail.startedAt,
                        historyTrainingDetail.finishedAt,
                      )
                    }}
                  </dd>
                </div>
                <div>
                  <dt>전체 문항</dt>
                  <dd>{{ questionSummary.total }}건</dd>
                </div>
              </dl>

              <section class="question-results" aria-labelledby="question-results-title">
                <header>
                  <h3 id="question-results-title">문항 결과</h3>
                  <span>{{ detailQuestions.length }}건</span>
                </header>
                <p v-if="detailQuestions.length === 0" class="section-state">
                  저장된 문항 결과가 없습니다.
                </p>
                <template v-else>
                  <div class="question-table">
                    <div class="question-table__head">
                      <span>문항</span>
                      <span>정답 여부</span>
                      <span>학습자 답</span>
                      <span>정답</span>
                    </div>
                    <div
                      v-for="question in detailQuestions"
                      :key="question.questionNo"
                      class="question-table__row"
                    >
                      <span class="question-content">
                        <b>{{ question.questionNo }}</b>
                        <span>
                          <small>{{ trainingQuestionTypeLabel(question) }}</small>
                          {{ formatTrainingQuestionContent(question.question) }}
                        </span>
                      </span>
                      <span class="question-grading">
                        <em :class="questionStatusClass(question)">
                          {{ questionStatus(question) }}
                        </em>
                        <small v-if="formatQuestionScore(question.score)">
                          {{ formatQuestionScore(question.score) }}
                        </small>
                      </span>
                      <span>{{ selectedAnswerDetail(question) }}</span>
                      <span>{{ correctAnswerDetail(question) }}</span>
                    </div>
                  </div>
                </template>
              </section>
            </template>
          </div>

          <div v-if="selectedHistoryTrainingId !== null" class="history-gaze-shell">
            <GazeAnalysisPanel
              title="훈련 시선 분석"
              :state="historyGazeAggregate"
              :status="historyGazeStatus"
              :error="historyGazeError"
              :show-status="false"
              :show-aggregate-chart="false"
              :show-disclaimer="false"
              @retry="trainingStore.retryHistoryGaze()"
            />
          </div>
        </Card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.training-history {
  gap: 20px;
  container-type: inline-size;
}

.period-field {
  display: flex;
  width: auto;
  align-items: center;
}

.period-field select {
  width: 120px;
  min-height: 34px;
  padding: 0 28px 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--slate-800);
  font-size: 11px;
}

.history-workspace {
  display: grid;
  gap: 20px;
}

.history-summary-grid {
  display: grid;
  align-items: stretch;
  gap: 20px;
  grid-template-columns: minmax(270px, 0.72fr) minmax(520px, 1.7fr);
}

.history-empty-card {
  min-height: 240px;
  padding: 24px;
}

.curriculum-browser,
.curriculum-overview,
.detail-card {
  min-width: 0;
  gap: 0;
  border-radius: var(--radius-lg);
}

.curriculum-browser,
.curriculum-overview {
  height: 100%;
}

.curriculum-browser,
.curriculum-overview,
.detail-card {
  padding: 20px;
}

.curriculum-browser {
  display: flex;
  height: 500px;
  flex-direction: column;
  align-content: start;
}

.curriculum-overview {
  display: flex;
  flex-direction: column;
  align-content: start;
}

.section-heading,
.detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-heading h2,
.detail-heading h2 {
  margin: 0;
  font-size: 17px;
}

.curriculum-browser__heading {
  align-items: center;
  flex-direction: row;
}

.detail-heading p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}

.curriculum-groups {
  display: grid;
  flex: 1;
  align-content: start;
  gap: 14px;
  margin-top: 16px;
  overflow: hidden;
}

.curriculum-group h3 {
  margin: 0 0 8px;
  color: var(--slate-600);
  font-size: 13px;
  font-weight: 700;
}

.curriculum-list,
.training-list {
  display: grid;
  gap: 6px;
}

.curriculum-row {
  display: grid;
  width: 100%;
  min-height: 54px;
  padding: 6px 10px;
  grid-template-columns: 34px minmax(90px, 1fr) auto 16px;
  justify-content: stretch;
  border: 1px solid var(--slate-200);
  border-radius: 14px;
  background: transparent;
  color: var(--slate-700);
  text-align: left;
}

.curriculum-row__icon,
.training-accuracy__icon {
  display: grid;
  border-radius: 50%;
  background: var(--slate-100);
  color: var(--slate-600);
  place-items: center;
}

.curriculum-row__icon {
  width: 30px;
  height: 30px;
}

.curriculum-row__icon svg,
.curriculum-row__chevron {
  width: 15px;
  height: 15px;
}

.curriculum-row strong {
  font-size: 14px;
}

.curriculum-row__accuracy small {
  display: block;
  color: var(--slate-500);
  font-size: 9px;
  line-height: 1.2;
  white-space: nowrap;
}

.curriculum-row__accuracy {
  text-align: right;
}

.curriculum-row__accuracy b {
  display: block;
  margin-top: 2px;
  color: var(--primary-600);
  font-size: 12px;
}

.curriculum-row__chevron {
  color: var(--slate-400);
}

.curriculum-row.active,
.training-row.active {
  border-color: color-mix(in oklch, var(--primary-600) 58%, var(--border));
  background: var(--active-selection-background);
  color: var(--active-selection-foreground);
}

.curriculum-row.active .curriculum-row__icon,
.training-row.active .sequence {
  background: var(--primary-600);
  color: white;
}

.curriculum-row.active .curriculum-row__chevron {
  color: var(--primary-600);
}

.curriculum-trainings {
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-top: 0;
}

.curriculum-trainings > h3 {
  margin: 0 0 12px;
  color: var(--slate-800);
  font-size: 14px;
}

.curriculum-trainings .training-list {
  padding-left: 16px;
}

.training-row {
  display: grid;
  position: relative;
  width: 100%;
  min-height: 66px;
  padding: 8px 14px 8px 0;
  grid-template-columns: 48px minmax(0, 1fr) 34px auto;
  justify-content: stretch;
  gap: 12px;
  border: 1px solid var(--slate-200);
  border-radius: 12px;
  background: white;
  color: var(--slate-700);
  text-align: left;
}

.sequence {
  display: grid;
  width: 30px;
  height: 30px;
  margin-left: -16px;
  border-radius: 50%;
  background: var(--primary-600);
  color: white;
  font-size: 12px;
  place-items: center;
}

.training-name {
  display: grid;
  min-width: 0;
  gap: 4px;
  overflow-wrap: anywhere;
}

.training-name strong {
  color: var(--slate-800);
  font-size: 13px;
}

.training-name small {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--slate-500);
  font-size: 11px;
}

.training-name small svg {
  width: 14px;
  height: 14px;
}

.training-accuracy__icon {
  width: 30px;
  height: 30px;
  color: var(--primary-600);
}

.training-accuracy__icon svg {
  width: 16px;
  height: 16px;
}

.training-row__accuracy {
  min-width: 64px;
  text-align: right;
}

.training-row__accuracy small {
  display: block;
  color: var(--slate-500);
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
}

.training-row__accuracy b {
  display: block;
  margin-top: 3px;
  color: var(--primary-600);
  font-size: 17px;
}

.curriculum-complete-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: auto 0 0;
  padding: 10px 12px;
  border: 1px solid color-mix(in oklch, var(--primary-600) 18%, var(--border));
  border-radius: 10px;
  background: color-mix(in oklch, var(--active-selection-background) 48%, white);
  color: var(--slate-600);
  font-size: 11px;
}

.curriculum-complete-note svg {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: var(--primary-600);
}

.curriculum-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 16px;
}

.curriculum-pagination span {
  min-width: 38px;
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.section-state {
  display: grid;
  min-height: 132px;
  align-content: center;
  justify-items: center;
  gap: 10px;
  margin: 12px 0 0;
  color: var(--slate-500);
  font-size: 12px;
  text-align: center;
}

.section-state p {
  margin: 0;
}

.section-state--error,
.export-error {
  color: var(--destructive);
}

.question-results h3 {
  margin: 0;
  font-size: 13px;
}

.detail-metrics {
  display: grid;
  gap: 8px;
  margin: 10px 0 0;
}

.detail-metrics > div {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 32%, transparent);
}

dt {
  color: var(--slate-500);
  font-size: 11px;
}

dd {
  margin: 4px 0 0;
  color: var(--slate-800);
  font-size: 12px;
  font-weight: 700;
}

.detail-state {
  min-height: 300px;
}

.detail-heading > div > span {
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 700;
}

.detail-heading h2 {
  margin-top: 5px;
  font-size: 20px;
}

.detail-heading > strong {
  font-size: 22px;
}

.detail-content-shell {
  min-height: 340px;
  margin-top: 18px;
}

.detail-content-shell > :first-child {
  margin-top: 0;
}

.history-gaze-shell {
  min-height: 260px;
}

.detail-metrics {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 0;
}

.question-results {
  margin-top: 18px;
}

.result-summary {
  display: grid;
  gap: 8px;
  margin: 0 0 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.result-summary > div {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 32%, transparent);
}

.question-results > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.question-results > header span {
  color: var(--slate-500);
  font-size: 11px;
}

.question-table {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.question-table__head,
.question-table__row {
  display: grid;
  min-width: 750px;
  align-items: center;
  gap: 12px;
  grid-template-columns: minmax(260px, 1.5fr) 110px minmax(130px, 0.8fr) minmax(130px, 0.8fr);
}

.question-table__head {
  min-height: 38px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--slate-300);
  background: var(--muted);
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
}

.question-table__row {
  min-height: 52px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--slate-200);
  color: var(--slate-700);
  font-size: 12px;
}

.question-table__row:last-child {
  border-bottom: 0;
}

.question-table__row > span:first-child {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.question-content > span,
.question-grading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.question-content small,
.question-grading small {
  color: var(--slate-500);
  font-size: 10px;
}

.question-table__row > span:first-child b {
  display: grid;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border-radius: 50%;
  background: var(--slate-100);
  font-size: 10px;
  place-items: center;
}

.question-table em {
  width: fit-content;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.is-correct {
  background: color-mix(in oklch, var(--success-600) 12%, transparent);
  color: var(--success-600);
}

.is-incorrect {
  background: color-mix(in oklch, var(--destructive) 10%, transparent);
  color: var(--destructive);
}

.is-ungraded {
  background: var(--slate-100);
  color: var(--slate-500);
}

.export-error {
  margin: 12px 0 0;
  font-size: 12px;
}

.download-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.state-card {
  align-items: flex-start;
  padding: 24px;
}

.state-card p {
  margin: 0;
  color: var(--slate-500);
}

.state-card--error strong {
  color: var(--destructive);
}

@container (max-width: 1050px) {
  .history-summary-grid {
    grid-template-columns: 1fr;
  }

  .curriculum-browser,
  .curriculum-overview {
    height: auto;
  }

  .curriculum-groups {
    max-height: none;
    overflow: visible;
  }
}
@container (max-width: 720px) {
  .history-summary-grid,
  .detail-metrics,
  .result-summary {
    grid-template-columns: 1fr;
  }

  .curriculum-browser,
  .curriculum-overview,
  .detail-card {
    padding: 16px;
  }
}

@container (max-width: 480px) {
  .section-heading,
  .detail-heading,
  .question-results > header {
    align-items: flex-start;
    flex-direction: column;
  }

  .period-field {
    width: 100%;
  }

  .curriculum-row {
    grid-template-columns: 34px minmax(0, 1fr) 16px;
  }

  .curriculum-row small {
    display: none;
  }

  .training-row {
    padding-right: 10px;
    grid-template-columns: 36px minmax(0, 1fr) auto;
  }

  .training-accuracy__icon {
    display: none;
  }

  .training-row__accuracy {
    min-width: 56px;
  }

  .training-row__accuracy small {
    display: none;
  }

  .training-row__accuracy b {
    font-size: 14px;
  }

  .download-actions :deep([data-slot='button']) {
    flex: 1 1 120px;
  }
}
</style>
