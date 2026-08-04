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
import type { GazeAnalysisState } from '@/features/teacher/gaze'
import {
  averageTestMetric,
  formatContentGenerationStatus,
  formatRecommendationStatus,
  formatTeacherReviewStatus,
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
  trendError,
  selectedQuestionTestId,
  selectedQuestionSequenceNo,
  questionGazeAnalysis,
  questionGazeStatus,
  questionGazeError,
  questionGazeAvailability,
  questionGazeAvailabilityStatus,
  questionGazeAvailabilityFailedCount,
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
        question.sequenceNo === selectedQuestionSequenceNo.value,
    ) ?? null,
)
const gazeButtonQuestionKeys = computed(() => {
  const keys = new Set<string>()
  const seenTestIds = new Set<string>()
  for (const question of currentDetail.value?.questions ?? []) {
    if (seenTestIds.has(question.testId)) continue
    seenTestIds.add(question.testId)
    if (questionGazeAvailability.value[question.testId] === 'AVAILABLE') {
      keys.add(questionKey(question))
    }
  }
  return keys
})
const questionGazeAggregate = computed<GazeAnalysisState | null>(() => {
  const state = questionGazeAnalysis.value
  if (state?.status !== 'AVAILABLE') return state
  return {
    ...state,
    analysis: {
      ...state.analysis,
      replay: null,
    },
  }
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

interface MetricDefinition {
  readonly key: TestMetricKey
  readonly label: string
  readonly unit: '점' | '초' | '회'
}

const metricDefinitions: readonly MetricDefinition[] = [
  { key: 'overallScore', label: '전체 점수', unit: '점' },
  { key: 'solvingTimeSeconds', label: '문제 풀이 시간', unit: '초' },
  { key: 'gazeDepartureCount', label: '시선 이탈 횟수', unit: '회' },
  { key: 'pronunciationScore', label: '발음 점수', unit: '점' },
]
const chartPalette = [chartColors.blue, chartColors.green, chartColors.amber] as const

const metricCharts = computed(() =>
  metricDefinitions.map((metric) => {
    const values = displayedDetails.value.map((detail) => testMetricValue(detail, metric.key))
    const average = averageTestMetric(trendDetails.value, metric.key)
    const option: EChartsOption = {
      animationDuration: 520,
      animationDurationUpdate: 240,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'cubicOut',
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
        max: metric.key === 'overallScore' || metric.key === 'pronunciationScore' ? 100 : undefined,
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
                  label: { formatter: `${average.value}${metric.unit}`, position: 'insideEndTop' },
                  lineStyle: { color: chartColors.amber, width: 2, type: 'dashed' },
                  data: [{ name: '전체 평균', yAxis: average.value }],
                },
        },
        {
          name: `${metric.label} 연결선`,
          type: 'line',
          data: values,
          smooth: 0.2,
          symbol: 'circle',
          symbolSize: 8,
          silent: true,
          tooltip: { show: false },
          lineStyle: { color: chartColors.ink, width: 3 },
          itemStyle: {
            color: chartColors.white,
            borderColor: chartColors.ink,
            borderWidth: 2,
          },
          z: 3,
        },
      ],
    }
    return { ...metric, average, option }
  }),
)
const selectedMetricChart = computed(
  () => metricCharts.value.find((metric) => metric.key === selectedMetricKey.value) ?? null,
)

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
      detail.questions.map((question) => question.testId),
    )
  },
  { immediate: true },
)

async function changeCurrentTest(event: Event): Promise<void> {
  if (studentId.value === null) return
  const id = (event.target as HTMLSelectElement).value
  if (id) await testStore.selectCurrentTest(studentId.value, id)
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

function selectQuestion(question: TestQuestionResult): void {
  if (studentId.value !== null) {
    void testStore.selectQuestionGaze(studentId.value, question.testId, question.sequenceNo)
  }
}

function questionKey(question: TestQuestionResult): string {
  return `${question.testId}:${question.sequenceNo}`
}

function hasGazeButton(question: TestQuestionResult): boolean {
  return gazeButtonQuestionKeys.value.has(questionKey(question))
}

function isSelectedQuestion(question: TestQuestionResult): boolean {
  return (
    selectedQuestionTestId.value === question.testId &&
    selectedQuestionSequenceNo.value === question.sequenceNo
  )
}

function openRecommendedCurriculum(): void {
  const curriculumId = currentDetail.value?.dailyCurriculumId
  if (studentId.value === null || curriculumId == null) return
  void router.push({
    name: 'student-curriculum',
    params: { id: studentId.value },
    query: { curriculumId: String(curriculumId) },
  })
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

        <Card class="toolbar-card">
          <HistoryToolbar>
            <div class="selection-field">
              <Label for="current-test">기준 검사</Label>
              <select
                id="current-test"
                :value="currentTestCurriculumId ?? ''"
                :disabled="comparisonStatus === 'loading'"
                @change="changeCurrentTest"
              >
                <option
                  v-for="test in tests"
                  :key="test.testCurriculumId"
                  :value="test.testCurriculumId"
                >
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
            <template #status>
              완료 검사 {{ tests.length }}건 · 비교 {{ comparisonTestCurriculumIds.length }}/2건
            </template>
          </HistoryToolbar>
        </Card>

        <div v-if="comparisonTestCurriculumIds.length" class="comparison-chips">
          <span
            v-for="test in testStore.comparisonTests"
            :key="test.testCurriculumId"
            class="comparison-chip"
          >
            {{ testOptionLabel(test) }}
            <button
              type="button"
              :aria-label="`${testOptionLabel(test)} 비교 해제`"
              @click="removeComparison(test.testCurriculumId)"
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
            <header class="section-heading">
              <div>
                <h2>검사 지표 비교</h2>
              </div>
              <span v-if="trendStatus === 'loading'" class="status-pill">전체 평균 계산 중</span>
            </header>
            <div v-if="trendError" class="warning" role="status">
              <span>{{ trendError }}</span>
              <Button variant="outline" type="button" @click="testStore.retryTrend()">
                다시 확인
              </Button>
            </div>
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
            <ChartPanel
              v-if="selectedMetricChart"
              :option="selectedMetricChart.option"
              animated
              height="280px"
              :aria-label="`${selectedMetricChart.label} 검사 커리큘럼 비교 차트`"
              :summary="`${selectedMetricChart.label} 전체 평균 ${selectedMetricChart.average.value ?? '측정값 없음'}`"
            />
          </Card>

          <Card class="metric-section">
            <header class="section-heading"><h2>검사별 주요 기록</h2></header>
            <div class="detail-cards">
              <article
                v-for="(detail, index) in displayedDetails"
                :key="detail.testCurriculumId"
                class="detail-card"
              >
                <header>
                  <span>{{ index === 0 ? '기준 검사' : `비교 검사 ${index}` }}</span>
                  <strong>{{ testDate(detail) }}</strong>
                </header>
                <dl>
                  <div
                    data-metric-key="overallScore"
                    :class="{ highlighted: selectedMetricKey === 'overallScore' }"
                  >
                    <dt>전체 점수</dt>
                    <dd>{{ formatMetric(detail.overallScore, '점') }}</dd>
                  </div>
                  <div
                    data-metric-key="solvingTimeSeconds"
                    :class="{ highlighted: selectedMetricKey === 'solvingTimeSeconds' }"
                  >
                    <dt>문제 풀이 시간</dt>
                    <dd>{{ formatTestSeconds(detail.solvingTimeSeconds) }}</dd>
                  </div>
                  <div
                    data-metric-key="gazeDepartureCount"
                    :class="{ highlighted: selectedMetricKey === 'gazeDepartureCount' }"
                  >
                    <dt>시선 이탈 횟수</dt>
                    <dd>{{ formatMetric(detail.gazeDepartureCount, '회') }}</dd>
                  </div>
                  <div
                    data-metric-key="pronunciationScore"
                    :class="{ highlighted: selectedMetricKey === 'pronunciationScore' }"
                  >
                    <dt>발음 점수</dt>
                    <dd>{{ formatMetric(detail.pronunciationScore, '점') }}</dd>
                  </div>
                </dl>
              </article>
            </div>
          </Card>

          <Card class="area-section">
            <header class="section-heading">
              <div><h2>영역별 점수</h2></div>
              <strong>{{ formatMetric(currentDetail?.overallScore ?? null, '점') }}</strong>
            </header>
            <div class="area-grid">
              <article v-for="area in currentDetail?.areaScores ?? []" :key="area.trackCode">
                <span>{{ area.title }}</span>
                <strong>{{ formatMetric(area.score, '점') }}</strong>
                <small>{{ area.completedQuestions }}/{{ area.totalQuestions }}문항 완료</small>
              </article>
            </div>
          </Card>

          <Card class="recommendation-section">
            <header class="section-heading">
              <div>
                <h2>추천 훈련 커리큘럼</h2>
              </div>
              <span class="status-pill">{{
                formatRecommendationStatus(currentDetail?.recommendationStatus ?? null)
              }}</span>
            </header>
            <p v-if="currentDetail?.recommendationError" class="error-copy" role="alert">
              추천 생성 오류: {{ currentDetail.recommendationError }}
            </p>
            <dl class="recommendation-statuses">
              <div>
                <dt>AI 콘텐츠</dt>
                <dd>
                  {{
                    formatContentGenerationStatus(currentDetail?.contentGenerationStatus ?? null)
                  }}
                </dd>
              </div>
              <div>
                <dt>교수자 검수</dt>
                <dd>{{ formatTeacherReviewStatus(currentDetail?.teacherReviewStatus ?? null) }}</dd>
              </div>
              <div>
                <dt>최근 추천 시도</dt>
                <dd>{{ formatDateTime(currentDetail?.recommendationLastAttemptAt ?? null) }}</dd>
              </div>
              <div>
                <dt>재시도 횟수</dt>
                <dd>{{ currentDetail?.recommendationRetryCount ?? 0 }}회</dd>
              </div>
            </dl>
            <div class="recommendation-actions">
              <span v-if="currentDetail?.dailyCurriculumId !== null">
                추천 커리큘럼 #{{ currentDetail?.dailyCurriculumId }}
              </span>
              <span v-else>아직 연결된 추천 커리큘럼이 없습니다.</span>
              <Button
                type="button"
                :disabled="currentDetail?.dailyCurriculumId === null"
                @click="openRecommendedCurriculum"
              >
                추천 교안 검수하기
              </Button>
            </div>
          </Card>

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
            <p v-if="questionContractWarning" class="warning-copy" role="alert">
              {{ questionContractWarning }}
            </p>
            <p
              v-if="questionGazeAvailabilityStatus === 'loading'"
              class="gaze-availability-copy"
              aria-live="polite"
            >
              시선 분석 기록이 있는 검사 구간을 확인하는 중입니다.
            </p>
            <p
              v-else-if="questionGazeAvailabilityFailedCount > 0"
              class="warning-copy"
              role="status"
            >
              일부 검사 구간의 시선 분석 존재 여부를 확인하지 못했습니다.
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
                :key="`${question.testId}:${question.sequenceNo}`"
                :class="{ 'is-gaze-selected': isSelectedQuestion(question) }"
              >
                <header>
                  <div>
                    <strong>문항 {{ question.sequenceNo }}</strong>
                    <small>{{ question.trackCode }} · {{ question.responseType }}</small>
                  </div>
                  <span :class="questionStatusClass(question)">{{ questionStatus(question) }}</span>
                </header>
                <p>{{ question.question ?? '문항 내용 없음' }}</p>
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
                    <dd>{{ formatMetric(question.pronunciationScore, '점') }}</dd>
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
.toolbar-card { padding: 0; border: 0; background: transparent; box-shadow: none; }
.selection-field { display: grid; min-width: 240px; gap: 6px; }
.selection-field label { color: var(--slate-600); font-size: 12px; font-weight: 700; }
.selection-field select { min-height: 40px; padding: 0 34px 0 12px; border: 1px solid var(--slate-300); border-radius: var(--radius-sm); background: var(--white); color: var(--slate-800); font: inherit; font-size: 13px; }
.comparison-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.comparison-chip { display: inline-flex; align-items: center; gap: 8px; padding: 7px 8px 7px 12px; border: 1px solid var(--primary-100); border-radius: 999px; background: var(--primary-50); color: var(--primary-700); font-size: 12px; font-weight: 700; }
.comparison-chip button { width: 22px; height: 22px; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; font-size: 17px; }
.state-card, .metric-chart-section, .metric-section, .area-section, .recommendation-section, .question-section { padding: 20px; border-radius: var(--radius-lg); }
.state-card { display: grid; justify-items: start; gap: 10px; }
.state-card--error { border-color: color-mix(in oklch, var(--danger-600) 25%, var(--border)); }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.section-heading h2 { margin: 0; color: var(--slate-900); font-size: 17px; }
.section-heading p { margin: 5px 0 0; color: var(--slate-500); font-size: 12px; }
.metric-chart-section, .metric-section, .area-section, .recommendation-section, .question-section { display: grid; gap: 14px; }
.metric-tabs { display: flex; gap: 6px; overflow-x: auto; }
.metric-tab { min-height: 38px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; background: var(--white); color: var(--slate-600); font: inherit; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.metric-tab.active { border-color: var(--primary-300); background: var(--active-selection-background); color: var(--active-selection-foreground); }
.status-pill { padding: 6px 9px; border-radius: 999px; background: var(--primary-50); color: var(--primary-700); font-size: 11px; font-weight: 700; }
.warning { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px 8px 14px; border: 1px solid var(--warning-500); border-radius: var(--radius-sm); color: var(--slate-700); font-size: 12px; }
.detail-cards, .area-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.detail-card, .area-grid article { padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-md); background: color-mix(in oklch, var(--muted) 28%, transparent); }
.detail-card header { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 12px; font-size: 12px; }
.detail-card dl, .question-list dl { display: grid; gap: 8px; margin: 0; }
.detail-card dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.detail-card dl div, .question-list dl div { padding: 8px; border-radius: var(--radius-sm); }
.detail-card dl div.highlighted { background: var(--active-selection-background); }
dt { color: var(--slate-500); font-size: 11px; }
dd { margin: 3px 0 0; color: var(--slate-900); font-size: 13px; font-weight: 700; overflow-wrap: anywhere; }
.area-grid article { display: grid; gap: 6px; }
.area-grid article strong { font-size: 22px; }
.area-grid article small { color: var(--slate-500); }
.recommendation-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border-radius: var(--radius-sm); background: var(--primary-50); color: var(--primary-800); font-size: 13px; font-weight: 700; }
.recommendation-statuses { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 0; }
.recommendation-statuses div { padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: color-mix(in oklch, var(--muted) 28%, transparent); }
.error-copy { margin: 0; color: var(--danger-600); font-size: 13px; }
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
@media (max-width: 760px) {
  .selection-field { min-width: 100%; }
  .recommendation-actions, .section-heading { align-items: flex-start; flex-direction: column; }
  .recommendation-statuses { grid-template-columns: 1fr 1fr; }
  .question-list dl { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .detail-card dl, .question-list dl { grid-template-columns: 1fr; }
  .recommendation-statuses { grid-template-columns: 1fr; }
}
</style>
