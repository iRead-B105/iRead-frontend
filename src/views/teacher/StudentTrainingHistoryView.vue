<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import type { EChartsOption } from 'echarts'
import ChartPanel from '@/components/common/ChartPanel.vue'
import HistoryToolbar from '@/components/teacher/HistoryToolbar.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { chartColors } from '@/features/teacher/chartTheme'
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
  curriculumLogsStatus,
  trainingLogStatus,
  statisticsStatus,
  historyDetailStatus,
  exportingFormat,
  curriculumLogsError,
  trainingLogError,
  statisticsError,
  historyDetailError,
  exportError,
} = storeToRefs(trainingStore)

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const studentId = computed(() => parseStudentId(route.params.id))
const invalidStudentId = computed(() => studentId.value === null)
const detailQuestions = computed(() => trainingDetailQuestions(historyTrainingDetail.value))
const selectedAccuracyComparison = computed(
  () =>
    statistics.value?.accuracyComparisons.find(
      (comparison) => comparison.trainingId === selectedHistoryTrainingId.value,
    ) ?? null,
)
const readingSpeedPoints = computed(
  () => statistics.value?.readingSpeedTrend.points ?? [],
)
const speedChart = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value) => `${value}단어/분`,
  },
  grid: { left: 52, right: 24, top: 26, bottom: 38 },
  xAxis: {
    type: 'category',
    data: readingSpeedPoints.value.map((point) => formatChartDate(point.date)),
  },
  yAxis: {
    type: 'value',
    min: 0,
    axisLabel: { formatter: '{value}' },
  },
  series: [
    {
      name: '음성 기준 읽기 속도',
      type: 'line',
      smooth: false,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 6,
      data: readingSpeedPoints.value.map((point) => point.speed),
      lineStyle: { color: chartColors.blue, width: 2.5 },
      itemStyle: {
        color: chartColors.white,
        borderColor: chartColors.blue,
        borderWidth: 2,
      },
    },
  ],
}))

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
  await trainingStore.loadHistoryTrainingDetail(
    studentId.value,
    selectedHistoryTrainingId.value,
  )
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

function formatChartDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${Number(match[2])}/${Number(match[3])}` : value
}

function formatAccuracy(value: number | null): string {
  return value === null ? '기록 없음' : `${value}%`
}

function formatChangeRate(value: number | null | undefined): string {
  if (value == null) return '-'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${Number(value.toFixed(2))}%`
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
    <PageHeader
      title="훈련 이력"
      description="완료된 커리큘럼의 훈련 결과와 음성 기준 읽기 속도를 확인합니다."
    />

    <Card v-if="invalidStudentId" class="state-card state-card--error">
      <strong>올바른 학습자를 선택해 주세요.</strong>
      <p>훈련 이력을 조회하려면 학습자 목록에서 대상을 다시 선택해야 합니다.</p>
      <Button type="button" @click="router.push({ name: 'teacher-students' })">
        학습자 목록으로 이동
      </Button>
    </Card>

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
          <template #status>
            완료 커리큘럼 {{ curriculumLogs.length }}건
          </template>
        </HistoryToolbar>
      </Card>

      <div class="history-grid">
        <Card class="curriculum-card">
          <header class="section-heading">
            <div>
              <h2>완료 커리큘럼</h2>
              <p>완료일이 최근인 순서로 표시합니다.</p>
            </div>
          </header>

          <p v-if="curriculumLogsStatus === 'loading'" class="section-state">
            완료된 커리큘럼을 불러오는 중입니다.
          </p>
          <div v-else-if="curriculumLogsStatus === 'error'" class="section-state section-state--error">
            <p>{{ curriculumLogsError }}</p>
            <Button variant="outline" type="button" @click="trainingStore.retryHistory()">
              다시 불러오기
            </Button>
          </div>
          <p v-else-if="curriculumLogs.length === 0" class="section-state">
            선택한 기간에 완료된 커리큘럼이 없습니다.
          </p>
          <div v-else class="curriculum-list">
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
        </Card>

        <Card class="training-list-card">
          <header class="section-heading">
            <div>
              <h2>커리큘럼별 훈련</h2>
              <p>{{ selectedCurriculumLog ? `${formatDate(selectedCurriculumLog.date)} 완료` : '커리큘럼을 선택해 주세요.' }}</p>
            </div>
          </header>

          <p v-if="trainingLogStatus === 'loading'" class="section-state">
            훈련 목록을 불러오는 중입니다.
          </p>
          <div v-else-if="trainingLogStatus === 'error'" class="section-state section-state--error">
            <p>{{ trainingLogError }}</p>
            <Button variant="outline" type="button" @click="retrySelectedCurriculum">
              다시 불러오기
            </Button>
          </div>
          <p v-else-if="!trainingLog?.trainings.length" class="section-state">
            선택한 커리큘럼에 표시할 훈련이 없습니다.
          </p>
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
        </Card>

        <Card class="statistics-card">
          <header class="section-heading statistics-heading">
            <div>
              <h2>음성 읽기 속도 추이</h2>
              <p>분당 정확하게 읽은 단어 수를 표시합니다.</p>
            </div>
            <div class="change-rate">
              <strong>{{ formatChangeRate(statistics?.readingSpeedTrend.changeRate) }}</strong>
              <span>기간 시작 대비</span>
            </div>
          </header>

          <p v-if="statisticsStatus === 'loading'" class="section-state section-state--chart">
            통계를 불러오는 중입니다.
          </p>
          <div v-else-if="statisticsStatus === 'error'" class="section-state section-state--chart section-state--error">
            <p>{{ statisticsError }}</p>
            <Button variant="outline" type="button" @click="retrySelectedCurriculum">
              다시 불러오기
            </Button>
          </div>
          <p v-else-if="readingSpeedPoints.length === 0" class="section-state section-state--chart">
            선택한 기간의 음성 읽기 속도 자료가 없습니다.
          </p>
          <ChartPanel
            v-else
            :option="speedChart"
            height="240px"
            aria-label="음성 기준 읽기 속도 추이 차트"
          />

          <section class="accuracy-comparison" aria-labelledby="accuracy-comparison-title">
            <h3 id="accuracy-comparison-title">선택 훈련 정확도 비교</h3>
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
          <p v-if="historyDetailStatus === 'loading'" class="section-state detail-state">
            훈련 상세를 불러오는 중입니다.
          </p>
          <div v-else-if="historyDetailStatus === 'error'" class="section-state detail-state section-state--error">
            <p>{{ historyDetailError }}</p>
            <Button variant="outline" type="button" @click="retryDetail">
              상세 다시 불러오기
            </Button>
          </div>
          <p v-else-if="!historyTrainingDetail" class="section-state detail-state">
            상세를 확인할 훈련을 선택해 주세요.
          </p>
          <template v-else>
            <header class="detail-heading">
              <div>
                <span>선택 훈련 상세</span>
                <h2>{{ historyTrainingDetail.name }}</h2>
                <p>{{ trainingStatusLabel(historyTrainingDetail.status) }}</p>
              </div>
              <strong>{{ formatAccuracy(historyTrainingDetail.accuracy) }}</strong>
            </header>

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
                <dd>{{ formatTrainingDuration(historyTrainingDetail.startedAt, historyTrainingDetail.finishedAt) }}</dd>
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
  width: 180px;
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
  align-items: start;
  gap: 20px;
  grid-template-columns: minmax(240px, 0.7fr) minmax(300px, 0.9fr) minmax(360px, 1.2fr);
}

.curriculum-card,
.training-list-card,
.statistics-card,
.detail-card {
  min-width: 0;
  gap: 0;
  padding: 20px;
  border-radius: var(--radius-lg);
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

.change-rate {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 1px;
}

.change-rate strong {
  font-size: 18px;
}

.change-rate span {
  color: var(--slate-500);
  font-size: 11px;
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

.section-state--chart {
  min-height: 240px;
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

.detail-metrics {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 18px;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .statistics-card {
    grid-column: 1 / -1;
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
}
</style>
