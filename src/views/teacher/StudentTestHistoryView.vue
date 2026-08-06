<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import type { EChartsOption } from 'echarts'
import { CalendarDaysIcon, ChevronRightIcon } from '@lucide/vue'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import ChartPanel from '@/components/common/ChartPanel.vue'
import GazeAnalysisPanel from '@/components/teacher/GazeAnalysisPanel.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { chartColors } from '@/features/teacher/chartTheme'
import { asyncStateKind } from '@/features/teacher/error'
import type { GazeAnalysisState } from '@/features/teacher/gaze'
import {
  averageTestMetric,
  formatTestAnswer,
  formatTestDate,
  formatTestSeconds,
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
  currentTestCurriculumId,
  comparisonTestCurriculumIds,
  comparisonResult,
  trendDetails,
  availableComparisonTests,
  canAddComparison,
  listStatus,
  comparisonStatus,
  trendStatus,
  listError,
  listUiError,
  comparisonError,
  selectedQuestionTestId,
  selectedQuestionNo,
  questionGazeAnalysis,
  questionGazeStatus,
  questionGazeError,
  questionGazeAvailability,
  questionGazeAvailabilityStatus,
} = storeToRefs(testStore)
const listErrorKind = computed(() => asyncStateKind(listUiError.value))

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const studentId = computed(() => parseStudentId(route.params.id))
const invalidStudentId = computed(() => studentId.value === null)
const selectedMetricKey = ref<TestMetricKey>('overallScore')
type TestPeriod = '30d' | '3m'
const testPeriod = ref<TestPeriod>('30d')
const TEST_PAGE_SIZE = 5
const testPage = ref(1)
const filteredTests = computed(() => {
  const periodDays = testPeriod.value === '30d' ? 30 : 90
  const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000
  return tests.value.filter((test) => {
    const timestamp = new Date(test.completedAt ?? test.createdAt).getTime()
    return !Number.isFinite(timestamp) || timestamp >= cutoff
  })
})
const testPageCount = computed(() => Math.max(1, Math.ceil(filteredTests.value.length / TEST_PAGE_SIZE)))
const paginatedTests = computed(() => {
  const start = (testPage.value - 1) * TEST_PAGE_SIZE
  return filteredTests.value.slice(start, start + TEST_PAGE_SIZE)
})
const testGroups = computed(() => {
  const groups = new Map<string, { label: string; items: TestListItem[] }>()

  paginatedTests.value.forEach((test) => {
    const date = test.completedAt ?? test.createdAt
    const match = /^(\d{4})-(\d{2})/.exec(date)
    const key = match ? `${match[1]}-${match[2]}` : 'unknown'
    const label = match ? `${match[1]}년 ${Number(match[2])}월` : '날짜 미확인'
    const group = groups.get(key) ?? { label, items: [] }
    group.items.push(test)
    groups.set(key, group)
  })

  return [...groups.entries()].map(([key, group]) => ({ key, ...group }))
})
const displayedDetails = computed<TestDetail[]>(() => {
  if (!comparisonResult.value) return []
  return [comparisonResult.value.currentTest, ...comparisonResult.value.comparisonTests]
})
const currentDetail = computed(() => comparisonResult.value?.currentTest ?? null)
const selectedQuestion = computed(
  () =>
    currentDetail.value?.questions.find(
      (question) =>
        question.testId === selectedQuestionTestId.value &&
        question.questionNo === selectedQuestionNo.value,
    ) ?? null,
)
const gazeButtonQuestionKeys = computed(() => {
  const keys = new Set<string>()
  for (const question of currentDetail.value?.questions ?? []) {
    const availability = questionGazeAvailability.value[questionKey(question)]
    if (availability === 'AVAILABLE' || availability === 'ERROR') {
      keys.add(questionKey(question))
    }
  }
  return keys
})
const questionGazeAggregate = computed<GazeAnalysisState | null>(() => {
  return questionGazeAnalysis.value
})
const questionContractWarning = computed(() => {
  const detail = currentDetail.value
  if (!detail) return null
  const sequences = detail.questions.map((question) => question.sequenceNo)
  const hasExpectedSequences =
    sequences.length === 9 && sequences.every((sequence, index) => sequence === index + 1)
  if (detail.totalQuestions === 9 && detail.completedQuestions === 9 && hasExpectedSequences) {
    return null
  }
  return `9문항 완료 결과가 필요하지만 현재 ${detail.completedQuestions}/${detail.totalQuestions}문항, 상세 ${detail.questions.length}건이 제공되었습니다.`
})

function changeTestPeriod(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  if (value !== '30d' && value !== '3m') return
  testPeriod.value = value
  testPage.value = 1
  const nextTest = filteredTests.value[0]
  if (nextTest && !filteredTests.value.some((test) => test.testCurriculumId === currentTestCurriculumId.value)) {
    void selectCurrentTest(nextTest)
  }
}

interface MetricDefinition {
  readonly key: TestMetricKey
  readonly label: string
  readonly unit: '점' | '분' | '회'
}

const metricDefinitions: readonly MetricDefinition[] = [
  { key: 'overallScore', label: '전체 점수', unit: '점' },
  { key: 'solvingTimeSeconds', label: '문제 풀이 시간', unit: '분' },
  { key: 'gazeDepartureCount', label: '시선 이탈 횟수', unit: '회' },
  { key: 'pronunciationScore', label: '발음 점수', unit: '점' },
]
const chartScopes = [
  { trackCode: 'phonological', label: '음운 인식', color: chartColors.green },
  { trackCode: null, label: '전체', color: chartColors.blue },
  { trackCode: 'short-text', label: '짧은 글', color: chartColors.amber },
  { trackCode: 'fluency', label: '유창성', color: chartColors.red },
] as const

function measuredValues(values: readonly (number | null)[]): number[] {
  return values.filter((value): value is number => value !== null && Number.isFinite(value))
}

function scopedMetricValue(
  detail: TestDetail,
  metric: TestMetricKey,
  trackCode: string | null,
): number | null {
  if (trackCode === null) return testMetricValue(detail, metric)
  if (metric === 'overallScore') {
    return detail.areaScores.find((area) => area.trackCode === trackCode)?.score ?? null
  }

  const questions = detail.questions.filter((question) => question.trackCode === trackCode)
  if (metric === 'solvingTimeSeconds') {
    const values = measuredValues(questions.map((question) => question.solvingTimeSeconds))
    return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0)
  }
  if (metric === 'gazeDepartureCount') {
    const values = measuredValues(questions.map((question) => question.gazeDepartureCount))
    return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0)
  }

  const values = measuredValues(questions.map((question) => question.pronunciationScore))
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function chartMetricValue(value: number | null, metric: TestMetricKey): number | null {
  if (value === null || metric !== 'solvingTimeSeconds') return value
  return Math.round((value / 60) * 100) / 100
}

function formatChartMetric(value: unknown, metric: MetricDefinition): string {
  if (value === null || value === undefined) return '-'
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return '-'
  return metric.key === 'solvingTimeSeconds'
    ? formatTestSeconds(Math.round(numericValue * 60))
    : `${numericValue}${metric.unit}`
}

const scopeGradients = {
  null: { start: '#3b82f6', end: '#1d4ed8' },
  phonological: { start: '#22c55e', end: '#15803d' },
  'short-text': { start: '#f59e0b', end: '#b45309' },
  fluency: { start: '#ef4444', end: '#b91c1c' },
} as const

const metricCharts = computed(() =>
  metricDefinitions.map((metric) => {
    const average = averageTestMetric(trendDetails.value, metric.key)
    const chartAverage = chartMetricValue(average.value, metric.key)
    const option: EChartsOption = {
      animationDuration: 520,
      animationDurationUpdate: 240,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 10,
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15);',
        textStyle: { color: '#0f172a', fontSize: 12 },
        valueFormatter: (value) => formatChartMetric(value, metric),
      },
      legend: {
        top: 0,
        icon: 'circle',
        itemGap: 16,
        textStyle: { color: '#475569', fontSize: 12, fontWeight: 500 },
        data: chartScopes.map((scope) => scope.label),
      },
      grid: { left: 56, right: 24, top: 56, bottom: 44, containLabel: true },
      xAxis: {
        type: 'category',
        data: displayedDetails.value.map((detail, index) => seriesLabel(detail, index)),
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { interval: 0, fontSize: 12, color: '#334155', fontWeight: 600 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: metric.key === 'overallScore' || metric.key === 'pronunciationScore' ? 100 : undefined,
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#64748b', fontSize: 11, formatter: `{value}${metric.unit}` },
      },
      series: chartScopes.map((scope, index) => {
        const isLine = scope.trackCode === null
        const gradient = scopeGradients[scope.trackCode ?? 'null']
        const labelOffset: [number, number] = [
          (index - (chartScopes.length - 1) / 2) * 7,
          index % 2 === 0 ? 0 : -14,
        ]
        return {
          name: scope.label,
          type: isLine ? 'line' : 'bar',
          smooth: isLine,
          symbol: 'circle',
          symbolSize: isLine ? 8 : undefined,
          barMinHeight: isLine ? undefined : 2,
          barMaxWidth: isLine ? undefined : 28,
          barGap: '20%',
          data: displayedDetails.value.map((detail) =>
            chartMetricValue(scopedMetricValue(detail, metric.key, scope.trackCode), metric.key),
          ),
          emphasis: {
            focus: 'series',
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(15, 23, 42, 0.18)' },
          },
          label: {
            show: true,
            position: 'top',
            distance: 8,
            offset: labelOffset,
            color: '#334155',
            fontSize: 10,
            fontWeight: 600,
            formatter: (params: { readonly value?: unknown }) => {
              const value = params.value
              return value === null || value === undefined ? '' : formatChartMetric(value, metric)
            },
          },
          lineStyle: isLine ? { color: scope.color, width: 3 } : undefined,
          itemStyle: isLine
            ? { color: scope.color }
            : {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: gradient.start },
                    { offset: 1, color: gradient.end },
                  ],
                },
                borderRadius: [6, 6, 0, 0],
              },
          markLine:
            index !== 0 || chartAverage === null
              ? undefined
              : {
                  symbol: 'none',
                  label: {
                    formatter: (params: { readonly value?: unknown }) =>
                      `전체 평균: ${formatChartMetric(params.value, metric)}`,
                    position: 'insideEndTop',
                    backgroundColor: '#f8fafc',
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    borderRadius: 6,
                    padding: [4, 8],
                    color: '#334155',
                    fontSize: 11,
                    fontWeight: 700,
                  },
                  lineStyle: { color: '#64748b', width: 1.5, type: 'dashed' },
                  data: [{ name: '전체 평균', yAxis: chartAverage }],
                },
        }
      }),
    }
    return { ...metric, average, option }
  }),
)
const selectedMetricChart = computed(
  () => metricCharts.value.find((metric) => metric.key === selectedMetricKey.value) ?? null,
)
watch(testPageCount, (pageCount) => {
  if (testPage.value > pageCount) testPage.value = pageCount
})

watch(
  studentId,
  async (id) => {
    selectedMetricKey.value = 'overallScore'
    if (id === null) {
      testStore.reset()
      return
    }
    await testStore.loadForStudent(id)
  },
  { immediate: true },
)

watch(
  currentDetail,
  (detail) => {
    if (studentId.value === null || !detail || detail.questions.length === 0) return
    void testStore.loadQuestionGazeAvailability(
      studentId.value,
      detail.questions,
    )
  },
  { immediate: true },
)

async function selectCurrentTest(test: TestListItem): Promise<void> {
  if (studentId.value === null) return
  await testStore.selectCurrentTest(studentId.value, test.testCurriculumId)
}

async function onCurrentTestSelectChange(event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement
  if (studentId.value === null || !select.value) return
  await testStore.selectCurrentTest(studentId.value, select.value)
}

async function addComparison(event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement
  if (studentId.value === null) return
  const id = select.value
  select.value = ''
  if (id) await testStore.addComparisonTest(studentId.value, id)
}

async function removeComparison(id: string): Promise<void> {
  if (studentId.value !== null) await testStore.removeComparisonTest(studentId.value, id)
}

function testDate(test: TestListItem | TestDetail): string {
  return formatTestDate(test.completedAt ?? test.createdAt)
}

function testOptionLabel(test: TestListItem): string {
  return `${testDate(test)} · 실력 도전 #${test.testCurriculumId}`
}

function testChipLabel(test: TestListItem): string {
  return `${testDate(test)} - 실력 도전`
}

function seriesLabel(detail: TestDetail, index: number): string {
  return `${index === 0 ? '기준' : `비교 ${index}`} · ${testDate(detail)}`
}

function questionStatus(question: TestQuestionResult): string {
  if (question.correct === null) return '미채점'
  return question.correct ? '정답' : '오답'
}

function questionStatusClass(question: TestQuestionResult): string {
  if (question.correct === null) return 'is-ungraded'
  return question.correct ? 'is-correct' : 'is-incorrect'
}

function formatMetric(value: number | null, unit: string): string {
  return value === null ? '측정값 없음' : `${value}${unit}`
}

function formatPronunciationMetric(question: TestQuestionResult): string {
  const audioResponse = question.responseType === 'AUDIO' || question.responseType === 'VOICE'
  if (!audioResponse) return '해당 없음'
  return formatMetric(question.pronunciationScore, '점')
}

function selectQuestion(question: TestQuestionResult): void {
  if (studentId.value !== null) {
    void testStore.selectQuestionGaze(studentId.value, question.testId, question.questionNo)
  }
}

function questionKey(question: TestQuestionResult): string {
  return `${question.testId}:${question.questionNo}`
}

function hasGazeButton(question: TestQuestionResult): boolean {
  return gazeButtonQuestionKeys.value.has(questionKey(question))
}

function isSelectedQuestion(question: TestQuestionResult): boolean {
  return (
    selectedQuestionTestId.value === question.testId &&
    selectedQuestionNo.value === question.questionNo
  )
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
        title="실력 도전 검사 목록을 불러오는 중입니다"
        message="잠시만 기다려 주세요."
      />
      <AsyncStatePanel
        v-else-if="listStatus === 'error' && tests.length === 0"
        :kind="listErrorKind"
        title="실력 도전 검사 목록을 불러오지 못했습니다"
        :message="listError ?? '잠시 후 다시 시도해 주세요.'"
        :retry-label="listUiError?.retryable ? '다시 시도' : undefined"
        action-label="학습자 목록으로 이동"
        @retry="testStore.retryList()"
        @action="router.push({ name: 'teacher-students' })"
      />
      <AsyncStatePanel
        v-else-if="listStatus === 'success' && tests.length === 0"
        kind="empty"
        title="완료된 실력 도전 검사가 없습니다."
        message="학습자가 9문제를 모두 완료하면 이 화면에서 결과를 확인할 수 있습니다."
      />

      <template v-else-if="tests.length > 0">
        <AsyncStatePanel
          v-if="listStatus === 'error'"
          :kind="listErrorKind"
          title="최신 검사 목록을 불러오지 못했습니다"
          :message="`${listError ?? '잠시 후 다시 시도해 주세요.'} 이전 결과를 계속 표시합니다.`"
          :retry-label="listUiError?.retryable ? '다시 시도' : undefined"
          compact
          @retry="testStore.retryList()"
        />

        <div class="test-comparison-workspace">
          <Card class="test-browser">
            <header class="section-heading test-browser__heading">
              <h2>완료한 검사</h2>
              <select
                class="history-period-select"
                :value="testPeriod"
                aria-label="조회 기간"
                :disabled="listStatus === 'loading'"
                @change="changeTestPeriod"
              >
                <option value="30d">최근 30일</option>
                <option value="3m">최근 3개월</option>
              </select>
            </header>
            <select
              id="current-test"
              class="sr-only"
              :value="currentTestCurriculumId ?? ''"
              @change="onCurrentTestSelectChange"
            >
              <option v-for="test in tests" :key="test.testCurriculumId" :value="test.testCurriculumId">
                {{ test.testCurriculumId }}
              </option>
            </select>
            <div class="test-groups">
              <section v-for="group in testGroups" :key="group.key" class="test-group">
                <h3>{{ group.label }}</h3>
                <div class="test-list">
                  <Button
                    v-for="test in group.items"
                    :key="test.testCurriculumId"
                    variant="ghost"
                    type="button"
                    class="test-row"
                    :class="{ active: test.testCurriculumId === currentTestCurriculumId }"
                    :aria-pressed="test.testCurriculumId === currentTestCurriculumId"
                    :disabled="comparisonStatus === 'loading'"
                    @click="selectCurrentTest(test)"
                  >
                    <span class="test-row__icon"><CalendarDaysIcon aria-hidden="true" /></span>
                    <strong>{{ testDate(test) }}</strong>
                    <span class="test-row__score">
                      <small>전체 점수</small>
                      <b>{{ formatMetric(test.overallScore, '점') }}</b>
                    </span>
                    <ChevronRightIcon class="test-row__chevron" aria-hidden="true" />
                  </Button>
                </div>
              </section>
            </div>
            <nav class="test-pagination" aria-label="완료 검사 페이지">
              <Button
                variant="outline"
                size="sm"
                type="button"
                :disabled="testPage === 1"
                @click="testPage -= 1"
              >
                이전
              </Button>
              <span>{{ testPage }} / {{ testPageCount }}</span>
              <Button
                variant="outline"
                size="sm"
                type="button"
                :disabled="testPage === testPageCount"
                @click="testPage += 1"
              >
                다음
              </Button>
            </nav>
          </Card>

          <Card
            v-if="comparisonStatus === 'loading' && !comparisonResult"
            class="state-card"
            aria-live="polite"
          >
            <strong>선택한 검사 결과를 불러오는 중입니다.</strong>
          </Card>
          <Card
            v-else-if="comparisonStatus === 'error' && !comparisonResult"
            class="state-card state-card--error"
          >
            <strong>{{ comparisonError }}</strong>
            <Button type="button" @click="testStore.retryComparison()">다시 시도</Button>
          </Card>
          <Card
            v-else-if="comparisonResult"
            class="metric-chart-section"
          >
            <header class="section-heading metric-chart-heading">
              <div>
                <h2>검사 지표 비교</h2>
                <small v-if="currentDetail" class="test-heading-subtitle">{{ testOptionLabel(currentDetail) }} · 영역별 점수</small>
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
                      comparisonTestCurriculumIds.length >= 2
                        ? '최대 두 건을 선택했습니다'
                        : '검사를 선택해 주세요'
                    }}
                  </option>
                  <option
                    v-for="test in availableComparisonTests"
                    :key="test.testCurriculumId"
                    :value="test.testCurriculumId"
                  >
                    {{ testOptionLabel(test) }}
                  </option>
                </select>
              </div>
            </header>
            <div class="comparison-chips">
              <span class="status-pill">비교 {{ comparisonTestCurriculumIds.length }}/2건</span>
              <span
                v-for="test in testStore.comparisonTests"
                :key="test.testCurriculumId"
                class="comparison-chip"
              >
                {{ testChipLabel(test) }}
                <button
                  type="button"
                  :aria-label="`${testChipLabel(test)} 비교 해제`"
                  @click="removeComparison(test.testCurriculumId)"
                >
                  ×
                </button>
              </span>
            </div>
            <span v-if="trendStatus === 'loading'" class="status-pill">전체 평균 계산 중</span>

            <div class="metric-tabs" role="tablist" aria-label="검사 비교 지표">
              <button
                v-for="metric in metricDefinitions"
                :key="metric.key"
                class="metric-tab"
                :class="{ active: selectedMetricKey === metric.key }"
                type="button"
                role="tab"
                :aria-selected="selectedMetricKey === metric.key"
                @click="selectedMetricKey = metric.key"
              >
                {{ metric.label }}
              </button>
            </div>
            <div
              v-if="comparisonStatus === 'loading'"
              class="metric-chart-state"
              data-test="metric-chart-loading"
              role="status"
            >
              검사 지표 비교 그래프를 갱신하는 중입니다.
            </div>
            <div
              v-else-if="comparisonStatus === 'error'"
              class="metric-chart-state metric-chart-state--error"
              role="alert"
            >
              <strong>{{ comparisonError }}</strong>
              <Button type="button" @click="testStore.retryComparison()">다시 시도</Button>
            </div>
            <ChartPanel
              v-if="selectedMetricChart"
              data-test="metric-chart"
              :option="selectedMetricChart.option"
              animated
              height="320px"
              :aria-label="`${selectedMetricChart.label} 검사 커리큘럼 비교 차트`"
              :summary="`${selectedMetricChart.label} 전체 평균 ${selectedMetricChart.average.value === null
                ? '측정값 없음'
                : formatChartMetric(
                    chartMetricValue(selectedMetricChart.average.value, selectedMetricChart.key),
                    selectedMetricChart,
                  )}`"
            />
          </Card>
        </div>

        <template v-if="comparisonResult">
          <Card class="question-section">
            <header class="section-heading">
              <div>
                <h2>9개 문항 결과</h2>
              </div>
              <span v-if="questionContractWarning === null" class="question-contract-ok">
                9문항 확인
              </span>
              <span v-else
                >{{ currentDetail?.completedQuestions }}/{{ currentDetail?.totalQuestions }}</span
              >
            </header>

            <p
              v-if="questionGazeAvailabilityStatus === 'loading'"
              class="gaze-availability-copy"
              aria-live="polite"
            >
              시선 분석 기록이 있는 검사 구간을 확인하는 중입니다.
            </p>

            <p
              v-else-if="
                questionGazeAvailabilityStatus === 'success' &&
                gazeButtonQuestionKeys.size === 0
              "
              class="gaze-availability-copy"
            >
              시선 분석이 기록된 검사 구간이 없습니다.
            </p>
            <div v-if="currentDetail?.questions.length === 0" class="inline-empty">
              제공된 문항 결과가 없습니다.
            </div>
            <ol v-else class="question-list">
              <li
                v-for="question in currentDetail?.questions"
                :key="question.sequenceNo"
                :class="{ 'is-gaze-selected': isSelectedQuestion(question) }"
              >
                <header>
                  <div>
                    <strong>문항 {{ question.sequenceNo }}</strong>
                    <small>{{ question.trackCode }} · {{ question.responseType }}</small>
                  </div>
                  <span :class="questionStatusClass(question)">{{ questionStatus(question) }}</span>
                </header>
                <p>{{ question.question ?? '문항 원본 없음' }}</p>
                <dl>
                  <div>
                    <dt>제출 답안</dt>
                    <dd>{{ formatTestAnswer(question.selectedAnswer) }}</dd>
                  </div>
                  <div>
                    <dt>정답</dt>
                    <dd>{{ formatTestAnswer(question.correctAnswer) }}</dd>
                  </div>
                  <div>
                    <dt>점수</dt>
                    <dd>{{ formatMetric(question.score, '점') }}</dd>
                  </div>
                  <div>
                    <dt>발음 점수</dt>
                    <dd>{{ formatPronunciationMetric(question) }}</dd>
                  </div>
                  <div>
                    <dt>풀이 시간</dt>
                    <dd>{{ formatTestSeconds(question.solvingTimeSeconds) }}</dd>
                  </div>
                  <div>
                    <dt>시선 이탈</dt>
                    <dd>{{ formatMetric(question.gazeDepartureCount, '회') }}</dd>
                  </div>
                </dl>
                <Button
                  v-if="hasGazeButton(question)"
                  variant="outline"
                  type="button"
                  :aria-pressed="isSelectedQuestion(question)"
                  @click="selectQuestion(question)"
                >
                  {{
                    isSelectedQuestion(question)
                      ? '시선 분석 선택됨'
                      : '이 검사 구간의 시선 분석 보기'
                  }}
                </Button>
              </li>
            </ol>
            <GazeAnalysisPanel
              v-if="selectedQuestion"
              :title="`문항 ${selectedQuestion.sequenceNo} 시선 분석`"
              :state="questionGazeAggregate"
              :status="questionGazeStatus"
              :error="questionGazeError"
              @retry="testStore.retryQuestionGaze()"
            />
          </Card>
        </template>
      </template>
    </template>
  </div>
</template>

<style scoped>
.test-history { gap: 20px; container-type: inline-size; }
.test-comparison-workspace { display: grid; align-items: stretch; gap: 20px; grid-template-columns: minmax(270px, 0.72fr) minmax(560px, 1.7fr); }
.test-browser { display: flex; min-width: 0; height: 500px; flex-direction: column; gap: 0; padding: 20px; border-radius: var(--radius-lg); }
.test-browser__heading { align-items: center; }
.history-period-select { width: 120px; min-height: 34px; padding: 0 28px 0 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--card); color: var(--slate-800); font-size: 11px; }
.test-groups { display: grid; flex: 1; align-content: start; gap: 14px; margin-top: 16px; overflow: hidden; }
.test-group h3 { margin: 0 0 8px; color: var(--slate-600); font-size: 13px; font-weight: 700; }
.test-list { display: grid; gap: 6px; }
.test-row { display: grid; width: 100%; min-height: 54px; padding: 6px 10px; grid-template-columns: 34px minmax(90px, 1fr) auto 16px; justify-content: stretch; border: 1px solid var(--slate-200); border-radius: 14px; background: transparent; color: var(--slate-700); text-align: left; }
.test-row__icon { display: grid; width: 30px; height: 30px; border-radius: 50%; background: var(--slate-100); color: var(--slate-600); place-items: center; }
.test-row__icon svg, .test-row__chevron { width: 15px; height: 15px; }
.test-row strong { font-size: 14px; }
.test-row__score { text-align: right; }
.test-row__score small { display: block; color: var(--slate-500); font-size: 9px; line-height: 1.2; white-space: nowrap; }
.test-row__score b { display: block; margin-top: 2px; color: var(--primary-600); font-size: 12px; }
.test-row__chevron { color: var(--slate-400); }
.test-row.active { border-color: color-mix(in oklch, var(--primary-600) 58%, var(--border)); background: var(--active-selection-background); color: var(--active-selection-foreground); }
.test-row.active .test-row__icon { background: var(--primary-600); color: white; }
.test-row.active .test-row__chevron { color: var(--primary-600); }
.test-pagination { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: auto; padding-top: 16px; }
.test-pagination span { min-width: 38px; color: var(--slate-500); font-size: 11px; font-weight: 700; text-align: center; }
.selection-field { display: grid; min-width: 240px; gap: 4px; }
.selection-field label { color: var(--slate-500); font-size: 10px; font-weight: 700; }
.selection-field select { min-height: 36px; padding: 0 34px 0 12px; border: 1px solid var(--slate-300); border-radius: var(--radius-sm); background: var(--white); color: var(--slate-800); font: inherit; font-size: 12px; }
.metric-chart-heading { align-items: flex-end; }
.comparison-chips { display: flex; min-width: 0; min-height: 28px; align-items: center; align-self: start; gap: 4px; padding-block: 1px; overflow-x: auto; overflow-y: hidden; }
.comparison-chip { display: inline-flex; min-height: 28px; flex: 0 1 auto; align-items: center; gap: 4px; padding: 2px 4px 2px 8px; border: 1px solid var(--primary-100); border-radius: 999px; background: var(--primary-50); color: var(--primary-700); font-size: 11px; font-weight: 700; line-height: 1; white-space: nowrap; }
.comparison-chip button { width: 18px; height: 18px; flex: 0 0 18px; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; font-size: 14px; line-height: 1; }
.state-card, .metric-chart-section, .question-section { min-width: 0; padding: 20px; border-radius: var(--radius-lg); }
.metric-chart-section { height: 500px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
.metric-chart-section::-webkit-scrollbar { display: none; }
.state-card { display: grid; justify-items: start; gap: 10px; }
.state-card--error { border-color: color-mix(in oklch, var(--danger-600) 25%, var(--border)); }
.metric-chart-state { min-height: 320px; display: grid; place-content: center; gap: 12px; text-align: center; color: var(--muted-foreground); }
.metric-chart-state--error { color: var(--danger-600); }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.section-heading h2 { margin: 0; color: var(--slate-900); font-size: 17px; font-weight: 700; }
.section-heading p { margin: 5px 0 0; color: var(--slate-500); font-size: 12px; }
.metric-chart-section, .question-section { display: grid; gap: 10px; }
.metric-tabs { display: flex; min-height: 28px; flex: 0 0 28px; align-items: center; gap: 4px; margin-top: -2px; overflow-x: auto; }
.metric-tab { height: 28px; flex: 0 0 auto; padding: 0 10px; border: 1px solid var(--border); border-radius: 999px; background: var(--white); color: var(--slate-600); font: inherit; font-size: 11px; font-weight: 700; line-height: 1; white-space: nowrap; cursor: pointer; }
.metric-tab.active { border-color: var(--primary-300); background: var(--active-selection-background); color: var(--active-selection-foreground); }
.status-pill { padding: 4px 8px; border-radius: 999px; background: var(--primary-50); color: var(--primary-700); font-size: 11px; font-weight: 700; }
.warning { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px 8px 14px; border: 1px solid var(--warning-500); border-radius: var(--radius-sm); color: var(--slate-700); font-size: 12px; }
.question-list dl { display: grid; gap: 8px; margin: 0; }
.question-list dl div { padding: 8px; border-radius: var(--radius-sm); }
dt { color: var(--slate-500); font-size: 11px; }
dd { margin: 3px 0 0; color: var(--slate-900); font-size: 13px; font-weight: 700; overflow-wrap: anywhere; }
.question-list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.question-list li { padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md); }
.question-list li.is-gaze-selected { border-color: var(--primary-300); background: var(--primary-50); }
.question-list li > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.question-list header div { display: grid; gap: 3px; }
.question-list header small { color: var(--slate-500); font-size: 11px; }
.question-list li > p { margin: 12px 0; color: var(--slate-800); }
.question-list dl { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.question-list dl div { background: var(--slate-50); }
.question-list li > button { margin-top: 12px; }
.question-contract-ok { color: var(--success-600); font-size: 12px; font-weight: 800; }
.warning-copy { margin: 0; padding: 10px 12px; border: 1px solid var(--warning-500); border-radius: var(--radius-sm); color: var(--slate-700); font-size: 12px; }
.gaze-availability-copy { margin: 0; color: var(--slate-500); font-size: 12px; }
.is-correct { color: var(--success-600); font-weight: 800; }
.is-incorrect { color: var(--danger-600); font-weight: 800; }
.is-ungraded { color: var(--slate-500); font-weight: 800; }
.inline-empty { padding: 24px; border: 1px dashed var(--slate-300); border-radius: var(--radius-sm); color: var(--slate-500); text-align: center; }
@container (max-width: 1050px) {
  .test-comparison-workspace { grid-template-columns: 1fr; }
  .test-browser, .metric-chart-section { height: auto; }
  .test-groups { max-height: none; overflow: visible; }
}
@media (max-width: 760px) {
  .selection-field { min-width: 100%; }
  .section-heading { align-items: flex-start; flex-direction: column; }
  .question-list dl { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .test-browser, .metric-chart-section, .question-section { padding: 16px; }
  .test-row { grid-template-columns: 34px minmax(0, 1fr) auto 16px; }
  .test-row__score small { display: none; }
  .metric-chart-heading { align-items: stretch; }
  .question-list dl { grid-template-columns: 1fr; }
}
</style>
