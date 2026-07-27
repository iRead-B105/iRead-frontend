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
  formatTestChange,
  formatTestDate,
  formatTestPercent,
  formatTestScore,
  formatTestSeconds,
  type TestDetail,
  type TestListItem,
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
  availableComparisonTests,
  canAddComparison,
  listStatus,
  comparisonStatus,
  listError,
  comparisonError,
} = storeToRefs(testStore)

const chartPalette = [
  chartColors.blue,
  chartColors.green,
  chartColors.amber,
] as const

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const studentId = computed(() => parseStudentId(route.params.id))
const invalidStudentId = computed(() => studentId.value === null)
const displayedDetails = computed<TestDetail[]>(() => {
  if (!comparisonResult.value) return []
  return [
    comparisonResult.value.currentTest,
    ...comparisonResult.value.comparisonTests,
  ]
})
const areaNames = computed(() => {
  const names = new Set<string>()
  displayedDetails.value.forEach((detail) => {
    detail.areaScores.forEach((areaScore) => names.add(areaScore.area))
  })
  return [...names]
})
const hasAreaScores = computed(() => areaNames.value.length > 0)
const areaChart = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value) => (value == null ? '-' : `${value}점`),
  },
  legend: {
    data: displayedDetails.value.map((detail, index) =>
      seriesLabel(detail, index),
    ),
    top: 4,
  },
  grid: { left: 52, right: 24, top: 52, bottom: 58 },
  xAxis: {
    type: 'category',
    data: areaNames.value,
    axisLabel: { interval: 0, rotate: areaNames.value.length > 4 ? 16 : 0 },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: { formatter: '{value}' },
  },
  series: displayedDetails.value.map((detail, index) => ({
    name: seriesLabel(detail, index),
    type: 'bar',
    data: areaNames.value.map(
      (area) =>
        detail.areaScores.find((areaScore) => areaScore.area === area)?.score ??
        null,
    ),
    itemStyle: {
      color: chartPalette[index] ?? chartColors.muted,
      borderRadius: [5, 5, 0, 0],
    },
  })),
}))

watch(
  studentId,
  async (id) => {
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

function listText(values: readonly string[]): string {
  return values.length > 0 ? values.join(' · ') : '-'
}

function testOptionLabel(test: TestListItem): string {
  return `${formatTestDate(test.date)} · 검사 #${test.testId}`
}
</script>

<template>
  <div class="test-history page-stack">
    <PageHeader
      title="검사 이력"
      description="완료된 검사 한 건의 상세를 확인하고 이전 검사와 최대 두 건까지 비교합니다."
    />

    <Card v-if="invalidStudentId" class="state-card state-card--error">
      <strong>올바른 학습자를 선택해 주세요.</strong>
      <p>검사 이력을 조회하려면 학습자 목록에서 대상을 다시 선택해야 합니다.</p>
      <Button type="button" @click="router.push({ name: 'teacher-students' })">
        학습자 목록으로 이동
      </Button>
    </Card>

    <template v-else>
      <Card v-if="listStatus === 'loading'" class="state-card" aria-live="polite">
        <strong>완료된 검사 목록을 불러오는 중입니다.</strong>
        <p>잠시만 기다려 주세요.</p>
      </Card>

      <Card v-else-if="listStatus === 'error'" class="state-card state-card--error">
        <strong>{{ listError }}</strong>
        <p>목록을 다시 요청하거나 학습자 목록으로 이동할 수 있습니다.</p>
        <div class="state-actions">
          <Button type="button" @click="testStore.retryList()">다시 시도</Button>
          <Button
            variant="outline"
            type="button"
            @click="router.push({ name: 'teacher-students' })"
          >
            학습자 목록으로 이동
          </Button>
        </div>
      </Card>

      <Card v-else-if="listStatus === 'success' && tests.length === 0" class="state-card">
        <strong>완료된 검사가 없습니다.</strong>
        <p>학습자가 검사를 완료하면 이 화면에서 상세 결과를 확인할 수 있습니다.</p>
      </Card>

      <template v-else-if="listStatus === 'success'">
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
                <option
                  v-for="test in tests"
                  :key="test.testId"
                  :value="test.testId"
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

        <div v-if="comparisonTestIds.length > 0" class="comparison-chips" aria-label="선택한 비교 검사">
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
          <p>최신 선택의 응답만 화면에 반영합니다.</p>
        </Card>

        <Card
          v-else-if="comparisonStatus === 'error'"
          class="state-card state-card--error"
        >
          <strong>{{ comparisonError }}</strong>
          <Button type="button" @click="testStore.retryComparison()">다시 시도</Button>
        </Card>

        <template v-else-if="comparisonStatus === 'success' && comparisonResult">
          <div class="result-grid">
            <Card class="result-chart">
              <header class="section-heading">
                <div>
                  <h2>영역별 검사 점수</h2>
                  <p>서버가 제공한 영역명과 0~100점 점수만 표시합니다.</p>
                </div>
              </header>
              <ChartPanel
                v-if="hasAreaScores"
                :option="areaChart"
                height="330px"
                aria-label="기준 검사와 선택한 비교 검사의 영역별 점수 차트"
              />
              <div v-else class="inline-empty">
                표시할 영역별 점수가 없습니다.
              </div>
            </Card>

            <Card class="result-summary">
              <header class="summary-heading">
                <span>기준 검사 종합</span>
                <div>
                  <strong>{{ formatTestScore(comparisonResult.currentTest.overallScore) }}</strong>
                  <small>{{ formatTestChange(comparisonResult.currentTest.changeFromPrevious) }}</small>
                </div>
              </header>
              <dl>
                <div>
                  <dt>강점 영역</dt>
                  <dd>{{ listText(comparisonResult.currentTest.strengthAreas) }}</dd>
                </div>
                <div>
                  <dt>보완 영역</dt>
                  <dd>{{ listText(comparisonResult.currentTest.improvementAreas) }}</dd>
                </div>
                <div>
                  <dt>권장 과정</dt>
                  <dd>{{ comparisonResult.currentTest.recommendedCourse ?? '-' }}</dd>
                </div>
                <div>
                  <dt>다음 검사 권장</dt>
                  <dd>{{ comparisonResult.currentTest.nextTestRecommendation ?? '-' }}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <Card class="metric-section">
            <header class="section-heading">
              <div>
                <h2>검사별 주요 기록</h2>
                <p>응답에 없는 값은 추정하지 않고 ‘-’로 표시합니다.</p>
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
                    <dt>종합 점수</dt>
                    <dd>{{ formatTestScore(detail.overallScore) }}</dd>
                  </div>
                  <div>
                    <dt>읽기 시간</dt>
                    <dd>{{ formatTestSeconds(detail.readingTimeSeconds) }}</dd>
                  </div>
                  <div>
                    <dt>문제 풀이 시간</dt>
                    <dd>{{ formatTestSeconds(detail.solvingTimeSeconds) }}</dd>
                  </div>
                  <div>
                    <dt>정확도</dt>
                    <dd>{{ formatTestPercent(detail.accuracy) }}</dd>
                  </div>
                </dl>
              </article>
            </div>
          </Card>

          <Card class="question-section">
            <header class="section-heading">
              <div>
                <h2>기준 검사 문항 결과</h2>
                <p>{{ formatTestDate(comparisonResult.currentTest.date) }} 검사 응답입니다.</p>
              </div>
            </header>
            <div
              v-if="comparisonResult.currentTest.questions.length === 0"
              class="inline-empty"
            >
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
  align-items: center;
  gap: 8px;
  padding: 7px 8px 7px 12px;
  border: 1px solid var(--primary-100);
  border-radius: 999px;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 12px;
  font-weight: 700;
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

.result-grid {
  display: grid;
  align-items: stretch;
  gap: 20px;
  grid-template-columns: minmax(0, 1fr) 320px;
}

.result-chart,
.result-summary,
.metric-section,
.question-section {
  min-width: 0;
  padding: 20px;
  border-radius: var(--radius-lg);
}

.result-chart {
  gap: 10px;
}

.result-summary {
  gap: 0;
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

.summary-heading {
  padding-bottom: 8px;
}

.summary-heading > span {
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 700;
}

.summary-heading > div {
  display: grid;
  gap: 5px;
  margin-top: 7px;
}

.summary-heading strong {
  color: var(--slate-900);
  font-size: 28px;
}

.summary-heading small {
  color: var(--slate-600);
  font-size: 12px;
  font-weight: 600;
}

.result-summary dl {
  display: grid;
  gap: 8px;
  margin: 16px 0 0;
}

.result-summary dl > div {
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 32%, transparent);
}

.result-summary dt,
.detail-card dt,
.question-list dt {
  color: var(--slate-500);
  font-size: 12px;
}

.result-summary dd,
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
  .result-grid {
    grid-template-columns: 1fr;
  }

  .result-summary {
    display: grid;
    align-items: start;
    gap: 28px;
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .result-summary dl {
    margin: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-cards {
    grid-template-columns: 1fr;
  }
}

@container (max-width: 640px) {
  .selection-field {
    width: 100%;
    min-width: 0;
  }

  .result-summary {
    gap: 20px;
    grid-template-columns: 1fr;
  }

  .result-summary dl {
    grid-template-columns: 1fr;
  }

  .detail-card dl,
  .question-list dl {
    grid-template-columns: 1fr;
  }
}
</style>
