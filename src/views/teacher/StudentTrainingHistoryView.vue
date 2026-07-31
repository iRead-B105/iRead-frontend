<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import type { EChartsOption } from 'echarts'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import ChartPanel from '@/components/common/ChartPanel.vue'
import GazeAnalysisPanel from '@/components/teacher/GazeAnalysisPanel.vue'
import HistoryToolbar from '@/components/teacher/HistoryToolbar.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { chartColors } from '@/features/teacher/chartTheme'
import { asyncStateKind } from '@/features/teacher/error'
import {
  formatTrainingDuration,
  trainingDetailQuestions,
  trainingLearningAssessment,
  trainingStatusLabel,
  type CurriculumLog,
  type CurriculumTrainingLogItem,
  type TrainingExportFormat,
  type TrainingPeriod,
  type TrainingQuestionResult,
} from '@/features/teacher/training'
import { saveDownload } from '@/lib/api'
import { useTrainingStore } from '@/stores/training'

const route = useRoute()
const router = useRouter()
const trainingStore = useTrainingStore()
const {
  period,
  curriculumLogs,
  selectedCurriculumId,
  selectedCurriculumLog,
  trainingLog,
  statistics,
  selectedHistoryTrainingId,
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
} = storeToRefs(trainingStore)
const curriculumLogsErrorKind = computed(() => asyncStateKind(curriculumLogsUiError.value))

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const studentId = computed(() => parseStudentId(route.params.id))
const invalidStudentId = computed(() => studentId.value === null)
const detailQuestions = computed(() => trainingDetailQuestions(historyTrainingDetail.value))
const selectedHistoryTraining = computed(
  () =>
    trainingLog.value?.trainings.find(
      (training) => training.trainingId === selectedHistoryTrainingId.value,
    ) ?? null,
)
const selectedAccuracyComparison = computed(
  () =>
    statistics.value?.accuracyComparisons.find(
      (comparison) => comparison.trainingId === selectedHistoryTrainingId.value,
    ) ?? null,
)
const accuracyComparisonChart = computed(() => {
  const currentAccuracy = selectedAccuracyComparison.value?.accuracy ?? null
  const previousAccuracy = selectedAccuracyComparison.value?.previousAccuracy ?? null
  const previousHasData = previousAccuracy !== null
  const currentHasData = currentAccuracy !== null
  const option: EChartsOption = {
    tooltip: { show: false },
    grid: { left: 42, right: 16, top: 34, bottom: 34 },
    xAxis: {
      type: 'category',
      data: ['이전 훈련', '현재 훈련'],
      axisLabel: { interval: 0 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        name: '정확도',
        type: 'bar',
        barMaxWidth: 54,
        label: { show: true, position: 'top' },
        data: [
          {
            value: previousAccuracy ?? 0,
            itemStyle: { color: previousHasData ? chartColors.muted : chartColors.grid },
            label: { formatter: previousHasData ? `${previousAccuracy}%` : '데이터 없음' },
          },
          {
            value: currentAccuracy ?? 0,
            itemStyle: { color: currentHasData ? chartColors.blue : chartColors.grid },
            label: { formatter: currentHasData ? `${currentAccuracy}%` : '데이터 없음' },
          },
        ],
      },
    ],
  }
  return {
    option,
    summary: `이전 훈련 정확도 ${formatAccuracy(previousAccuracy)}, 현재 훈련 정확도 ${formatAccuracy(currentAccuracy)}`,
  }
})
watch(
  studentId,
  async (id) => {
    if (id === null) {
      trainingStore.reset()
      return
    }
    await trainingStore.loadHistoryForStudent(id)
  },
  { immediate: true },
)

async function changePeriod(event: Event): Promise<void> {
  if (studentId.value === null) return
  const value = (event.target as HTMLSelectElement).value
  if (value !== '30d' && value !== '3m') return
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

async function downloadTraining(format: TrainingExportFormat): Promise<void> {
  if (studentId.value === null || selectedHistoryTrainingId.value === null) return
  const trainingId = selectedHistoryTrainingId.value
  const result = await trainingStore.exportSelectedTraining(studentId.value, format)
  if (!result) return
  saveDownload(result, `training-${trainingId}.${format.toLowerCase()}`)
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

function questionStatus(question: TrainingQuestionResult): string {
  if (question.isCorrect === null) return '미채점'
  return question.isCorrect ? '정답' : '오답'
}

function questionStatusClass(question: TrainingQuestionResult): string {
  if (question.isCorrect === null) return 'is-ungraded'
  return question.isCorrect ? 'is-correct' : 'is-incorrect'
}
</script>

<template>
  <div class="training-history page-stack">
    <PageHeader title="훈련 이력" />

    <AsyncStatePanel
      v-if="invalidStudentId"
      kind="not-found"
      title="올바른 학습자를 선택해 주세요."
      message="훈련 이력을 조회하려면 학습자 목록에서 대상을 다시 선택해야 합니다."
      action-label="학습자 목록으로 이동"
      @action="router.push({ name: 'teacher-students' })"
    />

    <template v-else>
      <Card class="toolbar-card">
        <HistoryToolbar>
          <div class="period-field">
            <Label for="training-period">조회 기간</Label>
            <select
              id="training-period"
              :value="period"
              :disabled="curriculumLogsStatus === 'loading'"
              @change="changePeriod"
            >
              <option value="30d">최근 30일</option>
              <option value="3m">최근 3개월</option>
            </select>
          </div>
          <template #status> 완료 커리큘럼 {{ curriculumLogs.length }}건 </template>
        </HistoryToolbar>
      </Card>

      <div class="history-grid">
        <Card class="history-selection-card" data-test="history-selection-card">
          <section class="history-selection-section curriculum-section">
            <header class="section-heading">
              <div>
                <h2>완료 커리큘럼</h2>
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
            <AsyncStatePanel
              v-else-if="curriculumLogsStatus === 'success' && curriculumLogs.length === 0"
              kind="empty"
              message="선택한 기간에 완료된 커리큘럼이 없습니다."
              compact
            />
            <div v-else class="curriculum-list">
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
              <Button
                v-for="curriculum in curriculumLogs"
                :key="curriculum.curriculumId"
                variant="ghost"
                type="button"
                class="curriculum-row"
                :class="{ active: curriculum.curriculumId === selectedCurriculumId }"
                :aria-pressed="curriculum.curriculumId === selectedCurriculumId"
                @click="selectCurriculum(curriculum)"
              >
                <span>
                  <strong>{{ formatDate(curriculum.date) }}</strong>
                  <small>{{ curriculum.trainings.length }}개 훈련</small>
                </span>
                <b>{{ formatAccuracy(curriculum.achievement) }}</b>
              </Button>
            </div>
          </section>

          <section class="history-selection-section training-section">
            <header class="section-heading">
              <div>
                <h2>커리큘럼별 훈련</h2>
                <p>
                  {{
                    selectedCurriculumLog
                      ? `${formatDate(selectedCurriculumLog.date)} 완료`
                      : '커리큘럼을 선택해 주세요.'
                  }}
                </p>
              </div>
            </header>

            <AsyncStatePanel
              v-if="trainingLogStatus === 'loading'"
              kind="loading"
              message="훈련 목록을 불러오는 중입니다."
              compact
            />
            <AsyncStatePanel
              v-else-if="trainingLogStatus === 'error'"
              kind="error"
              title="훈련 목록을 불러오지 못했습니다"
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
                  <small>{{ formatDateTime(training.finishedAt ?? training.startedAt) }}</small>
                </span>
                <b>{{ formatAccuracy(training.accuracy) }}</b>
              </Button>
            </div>
          </section>
        </Card>

        <Card class="statistics-card accuracy-card">
          <header class="section-heading">
            <div>
              <h2>선택 훈련 정확도 비교</h2>
            </div>
          </header>
          <AsyncStatePanel
            v-if="statisticsStatus === 'loading'"
            kind="loading"
            message="통계를 불러오는 중입니다."
            compact
          />
          <AsyncStatePanel
            v-else-if="statisticsStatus === 'error'"
            kind="error"
            title="훈련 통계를 불러오지 못했습니다"
            :message="statisticsError ?? '잠시 후 다시 시도해 주세요.'"
            retry-label="다시 불러오기"
            compact
            @retry="retrySelectedCurriculum"
          />
          <section v-else class="accuracy-comparison" aria-label="선택 훈련 정확도 비교">
            <ChartPanel
              :option="accuracyComparisonChart.option"
              height="220px"
              aria-label="현재 훈련과 이전 훈련 정확도 막대그래프"
              :summary="accuracyComparisonChart.summary"
            />
            <dl>
              <div>
                <dt>현재 정확도</dt>
                <dd>{{ formatAccuracy(selectedAccuracyComparison?.accuracy ?? null) }}</dd>
              </div>
              <div>
                <dt>이전 정확도</dt>
                <dd>{{ formatAccuracy(selectedAccuracyComparison?.previousAccuracy ?? null) }}</dd>
              </div>
              <div>
                <dt>이전 훈련일</dt>
                <dd>{{ formatDate(selectedAccuracyComparison?.previousTrainingDate ?? null) }}</dd>
              </div>
            </dl>
          </section>
        </Card>

        <Card class="detail-card">
          <header class="detail-heading">
            <div>
              <span>선택 훈련 상세</span>
              <template v-if="historyDetailStatus === 'success' && historyTrainingDetail">
                <h2>{{ historyTrainingDetail.name }}</h2>
                <p>{{ trainingStatusLabel(historyTrainingDetail.status) }}</p>
              </template>
              <template v-else>
                <h2>{{ selectedHistoryTraining?.trainingName ?? '훈련을 선택해 주세요.' }}</h2>
                <p v-if="historyDetailStatus === 'loading'">새 훈련 상세를 불러오는 중입니다.</p>
                <p v-else-if="historyDetailStatus === 'error'">상세 조회를 완료하지 못했습니다.</p>
              </template>
            </div>
            <strong v-if="historyDetailStatus === 'success' && historyTrainingDetail">
              {{ formatAccuracy(historyTrainingDetail.accuracy) }}
            </strong>
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
                  <dt>학습 판단</dt>
                  <dd>{{ trainingLearningAssessment(historyTrainingDetail) }}</dd>
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
                <div v-else class="question-table">
                  <div class="question-table__head">
                    <span>문항</span>
                    <span>정답 여부</span>
                    <span>학습자 답</span>
                    <span>정답</span>
                  </div>
                  <div
                    v-for="question in detailQuestions"
                    :key="question.questionNumber"
                    class="question-table__row"
                  >
                    <span>
                      <b>{{ question.questionNumber }}</b>
                      {{ question.question ?? '-' }}
                    </span>
                    <em :class="questionStatusClass(question)">
                      {{ questionStatus(question) }}
                    </em>
                    <span>{{ question.selectedAnswer ?? '-' }}</span>
                    <span>{{ question.correctAnswer ?? '-' }}</span>
                  </div>
                </div>
              </section>

              <p v-if="exportError" class="export-error" role="alert">{{ exportError }}</p>
              <div class="download-actions">
                <Button
                  variant="outline"
                  type="button"
                  :disabled="exportingFormat !== null"
                  @click="downloadTraining('CSV')"
                >
                  {{ exportingFormat === 'CSV' ? 'CSV 준비 중…' : 'CSV 저장' }}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  :disabled="exportingFormat !== null"
                  @click="downloadTraining('JSON')"
                >
                  {{ exportingFormat === 'JSON' ? 'JSON 준비 중…' : 'JSON 저장' }}
                </Button>
              </div>
            </template>
          </div>

          <div v-if="selectedHistoryTrainingId !== null" class="history-gaze-shell">
            <GazeAnalysisPanel
              title="훈련 시선 분석"
              :state="historyGazeAnalysis"
              :status="historyGazeStatus"
              :error="historyGazeError"
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

.toolbar-card {
  gap: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.toolbar-card :deep(.history-toolbar) {
  min-height: 76px;
  padding: 12px 0;
  border-bottom: 0;
}

.period-field {
  display: grid;
  width: min(100%, 180px);
  gap: 6px;
}

.period-field select {
  min-height: 40px;
  padding: 0 36px 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--slate-800);
  font: inherit;
}

.history-grid {
  display: grid;
  align-items: stretch;
  gap: 20px;
  grid-template-columns: minmax(560px, 1.6fr) minmax(360px, 1fr);
}

.history-selection-card,
.statistics-card,
.detail-card {
  min-width: 0;
  gap: 0;
  border-radius: var(--radius-lg);
}

.history-selection-card {
  display: grid;
  overflow: hidden;
  padding: 0;
  grid-template-columns: minmax(220px, 0.85fr) minmax(300px, 1.15fr);
}

.history-selection-section {
  min-width: 0;
  padding: 20px;
}

.history-selection-section + .history-selection-section {
  border-inline-start: 1px solid var(--border);
}

.statistics-card,
.detail-card {
  padding: 20px;
}

.detail-card {
  grid-column: 1 / -1;
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

.section-heading p,
.detail-heading p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}

.curriculum-list,
.training-list {
  display: grid;
  gap: 6px;
  margin-top: 16px;
}

.curriculum-row,
.training-row {
  width: 100%;
  min-height: 58px;
  justify-content: initial;
  border: 1px solid var(--slate-200);
  background: transparent;
  color: var(--slate-700);
  text-align: left;
}

.curriculum-row {
  justify-content: space-between;
}

.curriculum-row > span,
.training-name {
  display: grid;
  min-width: 0;
  gap: 3px;
  overflow-wrap: anywhere;
}

.curriculum-row small,
.training-row small {
  color: var(--slate-500);
  font-size: 11px;
}

.curriculum-row b,
.training-row > b {
  margin-left: auto;
  font-size: 12px;
}

.curriculum-row.active,
.training-row.active {
  border-color: color-mix(in oklch, var(--primary-600) 38%, var(--border));
  background: var(--active-selection-background);
  color: var(--active-selection-foreground);
}

.training-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
}

.sequence {
  display: grid;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--slate-100);
  color: var(--slate-600);
  font-size: 11px;
  place-items: center;
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

.accuracy-comparison {
  margin-top: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--slate-200);
}

.accuracy-card .accuracy-comparison {
  margin-top: 16px;
  padding-top: 0;
  border-top: 0;
}

.accuracy-comparison h3,
.question-results h3 {
  margin: 0;
  font-size: 13px;
}

.accuracy-comparison dl,
.detail-metrics {
  display: grid;
  gap: 8px;
  margin: 10px 0 0;
}

.accuracy-comparison dl {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.accuracy-comparison dl > div,
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
  min-width: 720px;
  align-items: center;
  gap: 12px;
  grid-template-columns: minmax(260px, 1.5fr) 80px minmax(130px, 0.8fr) minmax(130px, 0.8fr);
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
  .history-grid {
    grid-template-columns: 1fr;
  }

  .statistics-card {
    grid-column: auto;
  }
}
@container (max-width: 720px) {
  .history-grid,
  .detail-metrics,
  .accuracy-comparison dl {
    grid-template-columns: 1fr;
  }

  .statistics-card,
  .detail-card {
    grid-column: auto;
  }

  .history-selection-card {
    grid-template-columns: 1fr;
  }

  .history-selection-section {
    padding: 16px;
  }

  .history-selection-section + .history-selection-section {
    border-block-start: 1px solid var(--border);
    border-inline-start: 0;
  }

  .statistics-card,
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

  .download-actions :deep([data-slot='button']) {
    flex: 1 1 120px;
  }
}
</style>
