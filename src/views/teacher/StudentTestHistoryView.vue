<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  formatTestDate,
  formatTestPercent,
  formatTestSeconds,
  averageReverseReadCount,
  averageTestMetric,
  testGazeMap,
  testMetricValue,
  type TestDetail,
  type TestListItem,
  type TestMetricKey,
  type TestQuestionResult,
} from '@/features/teacher/test'
import { useTestStore } from '@/stores/test'

const route = useRoute()
const router = useRouter()
const testStore = useTestStore()
const {
  tests,
  currentTestId,
  comparisonTestIds,
  comparisonResult,
  trendDetails,
  trendGazeResults,
  gazeAnalysis,
  availableComparisonTests,
  canAddComparison,
  listStatus,
  comparisonStatus,
  trendStatus,
  gazeStatus,
  listError,
  listUiError,
  comparisonError,
  trendError,
  gazeError,
} = storeToRefs(testStore)
const listErrorKind = computed(() => asyncStateKind(listUiError.value))

const chartPalette = [chartColors.blue, chartColors.green, chartColors.amber] as const

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const studentId = computed(() => parseStudentId(route.params.id))
const invalidStudentId = computed(() => studentId.value === null)
const selectedMetricKey = ref<TestMetricKey>('accuracy')
const displayedDetails = computed<TestDetail[]>(() => {
  if (!comparisonResult.value) return []
  return [comparisonResult.value.currentTest, ...comparisonResult.value.comparisonTests]
})
const gazeByTestId = computed(() => testGazeMap(trendGazeResults.value))

interface MetricDefinition {
  readonly key: TestMetricKey
  readonly label: string
  readonly unit: '%' | '초' | '회'
}

const metricDefinitions: readonly MetricDefinition[] = [
  { key: 'accuracy', label: '정확도', unit: '%' },
  { key: 'solvingTimeSeconds', label: '문제 풀이 시간', unit: '초' },
  { key: 'gazeDepartureCount', label: '시선 이탈 횟수', unit: '회' },
  { key: 'reverseReadCount', label: '시선 역행 횟수', unit: '회' },
]

const metricCharts = computed(() =>
  metricDefinitions.map((metric) => {
    const values = displayedDetails.value.map((detail) =>
      testMetricValue(detail, metric.key, gazeByTestId.value),
    )
    const average =
      metric.key === 'reverseReadCount'
        ? averageReverseReadCount(trendGazeResults.value)
        : averageTestMetric(trendDetails.value, metric.key, gazeByTestId.value)
    const averageLabel = `전체 평균 · ${average.sampleCount}건 기준`
    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => (value == null ? '-' : `${value}${metric.unit}`),
      },
      grid: { left: 44, right: 18, top: 36, bottom: 48 },
      xAxis: {
        type: 'category',
        data: displayedDetails.value.map((detail, index) => seriesLabel(detail, index)),
        axisLabel: { interval: 0, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: metric.key === 'accuracy' ? 100 : undefined,
        axisLabel: { formatter: `{value}${metric.unit}` },
      },
      series: [
        {
          name: metric.label,
          type: 'bar',
          data: values.map((value, index) => ({
            value,
            itemStyle: {
              color: chartPalette[index] ?? chartColors.muted,
              borderRadius: [5, 5, 0, 0],
            },
          })),
          markLine:
            average.value === null
              ? undefined
              : {
                  symbol: 'none',
                  label: {
                    formatter: `${average.value}${metric.unit}`,
                    position: 'insideEndTop',
                  },
                  lineStyle: { color: chartColors.amber, width: 2, type: 'dashed' },
                  data: [{ name: averageLabel, yAxis: average.value }],
                },
        },
      ],
    }
    const selectedSummary = displayedDetails.value
      .map(
        (detail, index) =>
          `${seriesLabel(detail, index)} ${
            values[index] === null ? '기록 없음' : `${values[index]}${metric.unit}`
          }`,
      )
      .join(', ')
    return {
      ...metric,
      average,
      averageLabel,
      option,
      summary: `${metric.label}: ${selectedSummary}; ${averageLabel} ${
        average.value === null ? '기록 없음' : `${average.value}${metric.unit}`
      }`,
    }
  }),
)
const selectedMetricChart = computed(
  () => metricCharts.value.find((metric) => metric.key === selectedMetricKey.value) ?? null,
)

watch(
  studentId,
  async (id) => {
    selectedMetricKey.value = 'accuracy'
    if (id === null) {
      testStore.reset()
      return
    }
    await testStore.loadForStudent(id)
  },
  { immediate: true },
)

async function changeCurrentTest(event: Event): Promise<void> {
  if (studentId.value === null) return
  const testId = Number((event.target as HTMLSelectElement).value)
  if (!Number.isInteger(testId)) return
  await testStore.selectCurrentTest(studentId.value, testId)
}

async function addComparison(event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement
  if (studentId.value === null) return
  const testId = Number(select.value)
  select.value = ''
  if (!Number.isInteger(testId)) return
  await testStore.addComparisonTest(studentId.value, testId)
}

async function removeComparison(testId: number): Promise<void> {
  if (studentId.value === null) return
  await testStore.removeComparisonTest(studentId.value, testId)
}

function seriesLabel(detail: TestDetail, index: number): string {
  return `${index === 0 ? '기준' : `비교 ${index}`} · ${formatTestDate(detail.date)}`
}

function questionStatus(question: TestQuestionResult): string {
  if (question.isCorrect === null) return '미채점'
  return question.isCorrect ? '정답' : '오답'
}

function questionStatusClass(question: TestQuestionResult): string {
  if (question.isCorrect === null) return 'is-ungraded'
  return question.isCorrect ? 'is-correct' : 'is-incorrect'
}

function detailMetricValue(detail: TestDetail, metric: TestMetricKey): number | null {
  return testMetricValue(detail, metric, gazeByTestId.value)
}

function formatMetricValue(value: number | null, unit: string): string {
  return value === null ? '기록 없음' : `${value}${unit}`
}

function testOptionLabel(test: TestListItem): string {
  return `${formatTestDate(test.date)} · 검사 #${test.testId}`
}
</script>

<template>
  <div class="test-history page-stack">
    <PageHeader title="검사 이력" />

    <AsyncStatePanel
      v-if="invalidStudentId"
      kind="not-found"
      title="올바른 학습자를 선택해 주세요."
      message="검사 이력을 조회하려면 학습자 목록에서 대상을 다시 선택해야 합니다."
      action-label="학습자 목록으로 이동"
      @action="router.push({ name: 'teacher-students' })"
    />

    <template v-else>
      <AsyncStatePanel
        v-if="listStatus === 'loading' && tests.length === 0"
        kind="loading"
        title="완료된 검사 목록을 불러오는 중입니다"
        message="잠시만 기다려 주세요."
      />

      <AsyncStatePanel
        v-else-if="listStatus === 'error' && tests.length === 0"
        :kind="listErrorKind"
        title="완료된 검사 목록을 불러오지 못했습니다"
        :message="listError ?? '잠시 후 다시 시도해 주세요.'"
        :retry-label="listUiError?.retryable ? '다시 시도' : undefined"
        action-label="학습자 목록으로 이동"
        @retry="testStore.retryList()"
        @action="router.push({ name: 'teacher-students' })"
      />

      <AsyncStatePanel
        v-else-if="listStatus === 'success' && tests.length === 0"
        kind="empty"
        title="완료된 검사가 없습니다."
        message="학습자가 검사를 완료하면 이 화면에서 상세 결과를 확인할 수 있습니다."
      />

      <template v-else-if="tests.length > 0">
        <AsyncStatePanel
          v-if="listStatus === 'error'"
          :kind="listErrorKind"
          title="최신 검사 목록을 불러오지 못했습니다"
          :message="`${listError ?? '잠시 후 다시 시도해 주세요.'} 이전 검사 결과를 계속 표시합니다.`"
          :retry-label="listUiError?.retryable ? '다시 시도' : undefined"
          compact
          @retry="testStore.retryList()"
        />
        <AsyncStatePanel
          v-else-if="listStatus === 'loading'"
          kind="loading"
          title="최신 검사 목록을 확인하는 중입니다"
          message="이전 검사 결과를 계속 표시합니다."
          compact
        />
        <Card class="toolbar-card">
          <HistoryToolbar>
            <div class="selection-field">
              <Label for="current-test">기준 검사</Label>
              <select
                id="current-test"
                :value="currentTestId ?? ''"
                :disabled="comparisonStatus === 'loading'"
                @change="changeCurrentTest"
              >
                <option v-for="test in tests" :key="test.testId" :value="test.testId">
                  {{ testOptionLabel(test) }}
                </option>
              </select>
            </div>

            <div class="selection-field">
              <Label for="comparison-test">비교 검사 추가</Label>
              <select
                id="comparison-test"
                value=""
                :disabled="!canAddComparison"
                @change="addComparison"
              >
                <option value="" disabled>
                  {{
                    comparisonTestIds.length >= 2
                      ? '최대 두 건을 선택했습니다'
                      : '검사를 선택해 주세요'
                  }}
                </option>
                <option
                  v-for="test in availableComparisonTests"
                  :key="test.testId"
                  :value="test.testId"
                >
                  {{ testOptionLabel(test) }}
                </option>
              </select>
            </div>

            <template #status>
              완료 검사 {{ tests.length }}건 · 비교 {{ comparisonTestIds.length }}/2건
            </template>
          </HistoryToolbar>
        </Card>

        <div
          v-if="comparisonTestIds.length > 0"
          class="comparison-chips"
          aria-label="선택한 비교 검사"
        >
          <span
            v-for="test in testStore.comparisonTests"
            :key="test.testId"
            class="comparison-chip"
          >
            {{ testOptionLabel(test) }}
            <button
              type="button"
              :aria-label="`${testOptionLabel(test)} 비교 해제`"
              :disabled="comparisonStatus === 'loading'"
              @click="removeComparison(test.testId)"
            >
              ×
            </button>
          </span>
        </div>

        <Card v-if="comparisonStatus === 'loading'" class="state-card" aria-live="polite">
          <strong>선택한 검사 결과를 불러오는 중입니다.</strong>
        </Card>

        <Card v-else-if="comparisonStatus === 'error'" class="state-card state-card--error">
          <strong>{{ comparisonError }}</strong>
          <Button type="button" @click="testStore.retryComparison()">다시 시도</Button>
        </Card>

        <template v-else-if="comparisonStatus === 'success' && comparisonResult">
          <Card class="metric-chart-section">
            <header class="section-heading metric-chart-heading">
              <div>
                <h2>검사 지표 비교</h2>
              </div>
              <span v-if="trendStatus === 'loading'" class="average-status" aria-live="polite">
                전체 평균 계산 중
              </span>
            </header>
            <div v-if="trendError" class="average-warning" role="status">
              <span>{{ trendError }}</span>
              <Button variant="outline" type="button" @click="testStore.retryTrend()">
                다시 확인
              </Button>
            </div>
            <div class="metric-tabs" role="tablist" aria-label="검사 비교 지표">
              <button
                v-for="metric in metricDefinitions"
                :id="`test-metric-tab-${metric.key}`"
                :key="metric.key"
                class="metric-tab"
                :class="{ active: selectedMetricKey === metric.key }"
                type="button"
                role="tab"
                aria-controls="test-metric-panel"
                :aria-selected="selectedMetricKey === metric.key"
                @click="selectedMetricKey = metric.key"
              >
                {{ metric.label }}
              </button>
            </div>
            <div
              v-if="selectedMetricChart"
              id="test-metric-panel"
              class="metric-chart-panel"
              role="tabpanel"
              :aria-labelledby="`test-metric-tab-${selectedMetricChart.key}`"
            >
              <article class="metric-chart-card">
                <header>
                  <h3>{{ selectedMetricChart.label }}</h3>
                  <span>
                    {{ selectedMetricChart.averageLabel }}
                    <b v-if="selectedMetricChart.average.value !== null">
                      {{ selectedMetricChart.average.value }}{{ selectedMetricChart.unit }}
                    </b>
                  </span>
                </header>
                <ChartPanel
                  :option="selectedMetricChart.option"
                  height="280px"
                  :aria-label="`${selectedMetricChart.label} 기준·비교 검사와 전체 평균 차트`"
                  :summary="selectedMetricChart.summary"
                />
              </article>
            </div>
          </Card>

          <Card class="metric-section">
            <header class="section-heading">
              <div>
                <h2>검사별 주요 기록</h2>
              </div>
            </header>
            <div class="detail-cards">
              <article
                v-for="(detail, index) in displayedDetails"
                :key="detail.testId"
                class="detail-card"
              >
                <header>
                  <span>{{ index === 0 ? '기준 검사' : `비교 검사 ${index}` }}</span>
                  <strong>{{ formatTestDate(detail.date) }}</strong>
                </header>
                <dl>
                  <div>
                    <dt>읽기 시간</dt>
                    <dd>{{ formatTestSeconds(detail.readingTimeSeconds) }}</dd>
                  </div>
                  <div
                    data-metric-key="solvingTimeSeconds"
                    :class="{ highlighted: selectedMetricKey === 'solvingTimeSeconds' }"
                  >
                    <dt>문제 풀이 시간</dt>
                    <dd>{{ formatTestSeconds(detail.solvingTimeSeconds) }}</dd>
                  </div>
                  <div
                    data-metric-key="accuracy"
                    :class="{ highlighted: selectedMetricKey === 'accuracy' }"
                  >
                    <dt>정확도</dt>
                    <dd>{{ formatTestPercent(detail.accuracy) }}</dd>
                  </div>
                  <div
                    data-metric-key="gazeDepartureCount"
                    :class="{ highlighted: selectedMetricKey === 'gazeDepartureCount' }"
                  >
                    <dt>시선 이탈 횟수</dt>
                    <dd>
                      {{ formatMetricValue(detailMetricValue(detail, 'gazeDepartureCount'), '회') }}
                    </dd>
                  </div>
                  <div
                    data-metric-key="reverseReadCount"
                    :class="{ highlighted: selectedMetricKey === 'reverseReadCount' }"
                  >
                    <dt>시선 역행 횟수</dt>
                    <dd>
                      {{ formatMetricValue(detailMetricValue(detail, 'reverseReadCount'), '회') }}
                    </dd>
                  </div>
                </dl>
              </article>
            </div>
          </Card>

          <Card v-if="currentTestId !== null" class="gaze-card">
            <GazeAnalysisPanel
              title="검사 시선 분석"
              :state="gazeAnalysis"
              :status="gazeStatus"
              :error="gazeError"
              @retry="testStore.retryGazeAnalysis()"
            />
          </Card>

          <Card class="question-section">
            <header class="section-heading">
              <div>
                <h2>기준 검사 문항 결과</h2>
              </div>
            </header>
            <div v-if="comparisonResult.currentTest.questions.length === 0" class="inline-empty">
              제공된 문항 결과가 없습니다.
            </div>
            <ol v-else class="question-list">
              <li
                v-for="question in comparisonResult.currentTest.questions"
                :key="question.questionNumber"
              >
                <header>
                  <strong>문항 {{ question.questionNumber }}</strong>
                  <span :class="questionStatusClass(question)">
                    {{ questionStatus(question) }}
                  </span>
                </header>
                <p>{{ question.question ?? '문항 내용 없음' }}</p>
                <dl>
                  <div>
                    <dt>선택 답안</dt>
                    <dd>{{ question.selectedAnswer ?? '-' }}</dd>
                  </div>
                  <div>
                    <dt>정답</dt>
                    <dd>{{ question.correctAnswer ?? '-' }}</dd>
                  </div>
                </dl>
              </li>
            </ol>
          </Card>
        </template>
      </template>
    </template>
  </div>
</template>

<style scoped>
.test-history {
  gap: 20px;
  container-type: inline-size;
}

.toolbar-card {
  gap: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.toolbar-card :deep(.history-toolbar) {
  min-height: 76px;
  padding: 14px 0;
  border-bottom: 0;
}

.selection-field {
  display: grid;
  min-width: 240px;
  gap: 6px;
}

.selection-field label {
  color: var(--slate-600);
  font-size: 12px;
  font-weight: 700;
}

.selection-field select {
  min-height: 40px;
  padding: 0 34px 0 12px;
  border: 1px solid var(--slate-300);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--slate-800);
  font: inherit;
  font-size: 13px;
}

.selection-field select:disabled {
  background: var(--slate-100);
  color: var(--slate-500);
  cursor: not-allowed;
}

.comparison-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: -8px;
}

.comparison-chip {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  padding: 7px 8px 7px 12px;
  border: 1px solid var(--primary-100);
  border-radius: 999px;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 12px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.comparison-chip button {
  display: grid;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 17px;
  line-height: 1;
  place-items: center;
}

.comparison-chip button:hover {
  background: color-mix(in oklch, var(--primary-100) 70%, transparent);
}

.comparison-chip button:disabled {
  cursor: wait;
  opacity: 0.45;
}

.state-card {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 24px;
  border-radius: var(--radius-lg);
}

.state-card strong {
  color: var(--slate-900);
  font-size: 15px;
}

.state-card p {
  margin: 0;
  color: var(--slate-600);
  font-size: 13px;
}

.state-card--error {
  border-color: color-mix(in oklch, var(--danger-600) 25%, var(--border));
}

.state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metric-chart-section,
.metric-section,
.question-section,
.gaze-card {
  min-width: 0;
  padding: 20px;
  border-radius: var(--radius-lg);
}

.gaze-card :deep(.gaze-analysis) {
  padding-top: 0;
  border-top: 0;
}

.average-status {
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 999px;
  background: var(--slate-100);
  color: var(--slate-600);
  font-size: 11px;
  font-weight: 700;
}

.average-warning {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px 8px 14px;
  border: 1px solid color-mix(in oklch, var(--warning-500) 30%, var(--border));
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--warning-500) 8%, transparent);
  color: var(--slate-700);
  font-size: 12px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.section-heading h2 {
  margin: 0;
  color: var(--slate-900);
  font-size: 17px;
}

.section-heading p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}

.metric-chart-section {
  display: grid;
  gap: 14px;
}

.metric-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
}

.metric-tab {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--white);
  color: var(--slate-600);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.metric-tab:hover {
  background: var(--interactive-hover-background);
}

.metric-tab.active {
  border-color: color-mix(in oklch, var(--primary-600) 38%, var(--border));
  background: var(--active-selection-background);
  color: var(--active-selection-foreground);
}

.metric-chart-panel {
  min-width: 0;
}

.metric-chart-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: color-mix(in oklch, var(--muted) 32%, transparent);
}

.metric-chart-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.metric-chart-card h3 {
  margin: 0;
  color: var(--slate-900);
  font-size: 14px;
}

.metric-chart-card header span {
  display: grid;
  justify-items: end;
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
}

.metric-chart-card header b {
  margin-top: 3px;
  color: var(--slate-800);
  font-size: 13px;
}

.detail-card dt,
.question-list dt {
  color: var(--slate-500);
  font-size: 12px;
}

.detail-card dd,
.question-list dd {
  margin: 5px 0 0;
  color: var(--slate-800);
  font-size: 13px;
  font-weight: 700;
}

.metric-section,
.question-section {
  gap: 18px;
}

.detail-cards {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.detail-card {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--white);
}

.detail-card header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.detail-card header span {
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
}

.detail-card header strong {
  color: var(--slate-800);
  font-size: 13px;
}

.detail-card dl {
  display: grid;
  gap: 10px;
  margin: 14px 0 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-card dl > div {
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: 150ms ease;
}

.detail-card dl > div.highlighted {
  border-color: color-mix(in oklch, var(--primary-600) 30%, var(--border));
  background: var(--active-selection-background);
}

.detail-card dl > div.highlighted dt {
  color: var(--primary-700);
  font-weight: 800;
}

.question-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.question-list li {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--white);
}

.question-list li > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.question-list li > header span {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.question-list .is-correct {
  background: color-mix(in oklch, var(--success-600) 12%, transparent);
  color: var(--success-600);
}

.question-list .is-incorrect {
  background: color-mix(in oklch, var(--danger-600) 12%, transparent);
  color: var(--danger-600);
}

.question-list .is-ungraded {
  background: var(--slate-100);
  color: var(--slate-600);
}

.question-list p {
  margin: 12px 0;
  color: var(--slate-800);
  font-size: 13px;
  font-weight: 700;
}

.question-list dl {
  display: grid;
  gap: 10px;
  margin: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.question-list dl > div {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
}

.inline-empty {
  display: grid;
  min-height: 160px;
  color: var(--slate-500);
  font-size: 13px;
  place-items: center;
}

@container (max-width: 900px) {
  .detail-cards {
    grid-template-columns: 1fr;
  }
}

@container (max-width: 640px) {
  .selection-field {
    width: 100%;
    min-width: 0;
  }

  .detail-card dl,
  .question-list dl {
    grid-template-columns: 1fr;
  }

  .metric-chart-section,
  .metric-section,
  .question-section,
  .gaze-card {
    padding: 16px;
  }
}

@container (max-width: 480px) {
  .section-heading,
  .detail-card header,
  .question-list li > header {
    align-items: flex-start;
    flex-direction: column;
  }

  .comparison-chips {
    align-items: flex-start;
    flex-direction: column;
  }

  .comparison-chip {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
