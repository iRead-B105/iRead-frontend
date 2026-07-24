<script setup lang="ts">
// 훈련 세션을 선택해 상세 결과와 읽기 속도 변화를 확인하는 화면입니다.
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { EChartsOption } from 'echarts'
import ChartPanel from '@/components/common/ChartPanel.vue'
import GazeAnalysisPanel from '@/components/teacher/GazeAnalysisPanel.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { chartColors } from '@/features/teacher/chartTheme'
import { studentApi } from '@/features/teacher/adminApi'
import type { ReadingSpeedTrend } from '@/features/teacher/adminApi'
import type { TrainingSession } from '@/features/teacher/types'

const route = useRoute()
const trainingSessions = ref<TrainingSession[]>([])
// 첫 훈련을 기본 선택하며 데이터가 비어 있으면 id 1을 임시 기본값으로 씁니다.
const selectedSessionId = ref(1)
const readingSpeedTrend = ref<ReadingSpeedTrend>()
type ReadingSpeedBasis = 'voice' | 'gaze'

const speedBasis = ref<ReadingSpeedBasis>('voice')
const speedBasisOptions = [
  {
    value: 'voice',
    label: '음성 기준',
    description: '발화 시간을 기준으로 계산한 분당 정확 단어 수',
    seriesName: '음성 기준 읽기 속도',
  },
  {
    value: 'gaze',
    label: '아이 트래킹 기준',
    description: '시선 이동 시간을 기준으로 계산한 분당 읽은 단어 수',
    seriesName: '아이 트래킹 기준 읽기 속도',
  },
] as const

const activeSpeedBasis = computed(
  () => speedBasisOptions.find((option) => option.value === speedBasis.value) ?? speedBasisOptions[0],
)
// 선택 id가 바뀔 때 해당 훈련 객체를 다시 찾아 오른쪽 상세 내용도 갱신합니다.
const selectedSession = computed(() =>
  trainingSessions.value.find((session) => session.id === selectedSessionId.value),
)

const activeChangeRate = computed(() =>
  speedBasis.value === 'voice'
    ? readingSpeedTrend.value?.voiceChangeRate
    : readingSpeedTrend.value?.gazeChangeRate,
)

const activeSpeedData = computed(() =>
  (readingSpeedTrend.value?.points ?? []).map((point) =>
    speedBasis.value === 'voice' ? point.voiceSpeed : point.gazeSpeed,
  ),
)

onMounted(async () => {
  const studentId = Number(route.params.id)
  const [history, trend] = await Promise.all([
    studentApi.trainingHistory(studentId),
    fetchReadingSpeedTrend(studentId),
  ])
  trainingSessions.value = history.map((item) => ({
    id: item.trainingId,
    title: item.learningType,
    date: item.finishedAt ?? item.startedAt ?? item.date,
    achievement: Number(item.achievement ?? 0),
    curriculum: item.learningType,
    summary: `${item.date} 학습 기록`,
    questions: item.questions,
  }))
  selectedSessionId.value = trainingSessions.value[0]?.id ?? 1
  readingSpeedTrend.value = trend
})

// 선택한 산출 기준에 맞춰 차트의 설명과 계열 데이터를 함께 전환합니다.
const speedChart = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis', valueFormatter: (value) => `${value}단어/분` },
  grid: { left: 48, right: 24, top: 28, bottom: 34 },
  xAxis: {
    type: 'category',
    data: (readingSpeedTrend.value?.points ?? []).map((point) => formatChartDate(point.date)),
  },
  yAxis: { type: 'value', min: 0 },
  series: [
    {
      name: activeSpeedBasis.value.seriesName,
      type: 'line',
      smooth: false,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 5,
      data: activeSpeedData.value.map((value) => value ?? '-'),
      lineStyle: { color: chartColors.blue, width: 2.5 },
      itemStyle: {
        color: chartColors.white,
        borderColor: chartColors.blue,
        borderWidth: 2,
      },
    },
  ],
}))

async function fetchReadingSpeedTrend(studentId: number) {
  return studentApi.readingSpeedTrend(studentId)
}

function formatChartDate(value: string) {
  const [, month, day] = value.split('-').map(Number)
  return `${month}/${day}`
}

function formatChangeRate(value: number | null | undefined) {
  if (value == null) return '-'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${Number(value.toFixed(2))}%`
}

function formatSessionDate(value: string) {
  if (!value) return '-'

  const [date = '', time = ''] = value.trim().replace('T', ' ').split(/\s+/)
  const [, month, day] = date.split('-').map(Number)
  if (!Number.isFinite(month) || !Number.isFinite(day)) return '-'

  const displayTime = time ? ` ${time.slice(0, 5)}` : ''
  return `${month}월 ${day}일${displayTime}`
}

function getLearningStatus(score: number) {
  if (score >= 80) return '양호'
  if (score >= 60) return '보완 필요'
  return '재학습 권장'
}

function downloadRawData() {
  const session = selectedSession.value
  if (!session) return
  const rows = [
    ['항목', '값'],
    ['훈련명', session.title],
    ['학습일', session.date],
    ['진행률', `${session.achievement}%`],
    ['훈련 요약', session.summary],
    [],
    ['문항', '정답 여부', '학생의 답', '옳은 답'],
    ...session.questions.map((question) => [
      `${question.questionNumber}. ${question.question ?? '-'}`,
      question.correct ? '정답' : '오답',
      question.selectedAnswer ?? '-',
      question.correctAnswer ?? '-',
    ]),
  ]
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `training-${session.id}-raw-data.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function downloadJsonData() {
  const session = selectedSession.value
  if (!session) return

  const json = JSON.stringify(
    {
      trainingId: session.id,
      title: session.title,
      curriculum: session.curriculum,
      completedAt: session.date,
      achievement: session.achievement,
      status: getLearningStatus(session.achievement),
      summary: session.summary,
      questions: session.questions,
    },
    null,
    2,
  )
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `training-${session.id}-raw-data.json`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="training-history page-stack">
    <PageHeader title="훈련 이력" description="훈련 결과와 읽기 속도 변화를 확인합니다." />

    <div class="training-workspace">
      <div class="training-main">
        <Card class="session-history">
          <header class="section-heading">
            <div>
              <h2>훈련 기록</h2>
            </div>
          </header>

          <div class="session-table">
            <div class="session-table__head">
              <span>학습일</span><span>훈련명</span><span>결과</span>
            </div>
            <Button
              v-for="session in trainingSessions"
              :key="session.id"
              class="session-row"
              :class="{ active: session.id === selectedSessionId }"
              variant="ghost"
              type="button"
              @click="selectedSessionId = session.id"
            >
              <span>{{ formatSessionDate(session.date) }}</span>
              <strong>{{ session.curriculum }}</strong>
              <span class="session-result">
                <b>{{ session.achievement }}%</b>
                <small>{{ getLearningStatus(session.achievement) }}</small>
              </span>
            </Button>
          </div>
        </Card>

        <Card class="speed-trend">
          <header class="section-heading">
            <div>
              <h2>읽기 속도 추이</h2>
              <p>{{ activeSpeedBasis.description }}</p>
            </div>
            <div class="trend-summary">
              <strong>{{ formatChangeRate(activeChangeRate) }}</strong>
              <span>기간 시작 대비</span>
            </div>
          </header>
          <div class="speed-basis" role="group" aria-label="읽기 속도 산출 기준">
            <Button
              v-for="option in speedBasisOptions"
              :key="option.value"
              class="speed-basis__button"
              :class="{ active: speedBasis === option.value }"
              variant="ghost"
              size="sm"
              type="button"
              :aria-pressed="speedBasis === option.value"
              @click="speedBasis = option.value"
            >
              {{ option.label }}
            </Button>
          </div>
          <p v-if="!readingSpeedTrend?.points.length" class="speed-trend__empty">
            해당 기간의 읽기 속도 데이터가 없습니다.
          </p>
          <ChartPanel
            v-else
            :option="speedChart"
            height="250px"
            :aria-label="`${activeSpeedBasis.label} 읽기 속도 추이 차트`"
          />
        </Card>
      </div>

      <Card class="training-detail">
        <header class="detail-heading">
          <div>
            <span>선택한 훈련</span>
            <h2>{{ selectedSession?.title }}</h2>
            <p>{{ formatSessionDate(selectedSession?.date ?? '') }}</p>
          </div>
          <div class="detail-score">
            <strong>{{ selectedSession?.achievement }}%</strong>
            <span>{{ getLearningStatus(selectedSession?.achievement ?? 0) }}</span>
          </div>
        </header>

        <div class="training-summary">
          <span>훈련 요약</span>
          <p>{{ selectedSession?.summary }}</p>
        </div>

        <div class="question-results">
          <div class="question-results__table">
            <div class="question-results__head">
              <span>문항</span>
              <span>정답 여부</span>
              <span>학생의 답</span>
              <span>옳은 답</span>
            </div>
            <div
              v-for="question in selectedSession?.questions ?? []"
              :key="question.questionNumber"
              class="question-results__row"
            >
              <span class="question-results__question">
                <b>{{ question.questionNumber }}</b>
                {{ question.question ?? '-' }}
              </span>
              <span
                class="question-results__status"
                :class="question.correct ? 'is-correct' : 'is-incorrect'"
              >
                {{ question.correct ? '정답' : '오답' }}
              </span>
              <span>{{ question.selectedAnswer ?? '-' }}</span>
              <span>{{ question.correctAnswer ?? '-' }}</span>
            </div>
            <p v-if="!selectedSession?.questions.length" class="question-results__empty">
              저장된 문항 결과가 없습니다.
            </p>
          </div>
        </div>

        <div class="download-actions">
          <Button variant="outline" class="download-button" type="button" @click="downloadRawData">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />
            </svg>
            <span>CSV 저장</span>
          </Button>
          <Button variant="outline" class="download-button" type="button" @click="downloadJsonData">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 3h7l4 4v14H7zM14 3v5h4m-7 4-2 2 2 2m4-4 2 2-2 2" />
            </svg>
            <span>JSON 저장</span>
          </Button>
        </div>
      </Card>
    </div>

    <GazeAnalysisPanel
      title="선택 훈련 시선 분석"
      :description="`${selectedSession?.title ?? '선택한 훈련'}에서 읽기 어려움이 나타난 구간입니다.`"
    />
  </div>
</template>

<style scoped>
.training-history {
  gap: 20px;
  container-type: inline-size;
}
.training-workspace {
  display: grid;
  align-items: stretch;
  gap: 20px;
  grid-template-columns: minmax(0, 1.12fr) minmax(380px, 0.88fr);
}
.training-main {
  display: grid;
  min-width: 0;
  gap: 20px;
}
.session-history,
.speed-trend,
.training-detail {
  min-width: 0;
  gap: 0;
  padding: 20px;
  border-radius: var(--radius-lg);
}
.training-detail {
  height: 100%;
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
.session-table {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: min(640px, calc(100vh - 250px));
  margin-top: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.session-table__head,
.session-row {
  display: grid;
  align-items: center;
  gap: 14px;
  grid-template-columns: 120px minmax(0, 1fr) 88px;
}
.session-table__head {
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
.session-row {
  position: relative;
  width: 100%;
  min-height: 58px;
  padding: 10px 14px;
  border: 0;
  border-bottom: 1px solid var(--slate-200);
  background: transparent;
  color: var(--slate-600);
  text-align: left;
}
.session-row::before {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 0;
  width: 3px;
  background: transparent;
  content: '';
}
.session-row:hover {
  background: var(--interactive-hover-background);
}
.session-row.active::before {
  background: var(--primary-600);
}
.session-row.active {
  background: var(--active-selection-background);
  color: var(--active-selection-foreground);
}
.session-row.active strong,
.session-row.active .session-result b {
  color: var(--active-selection-foreground);
}
.session-row > span:first-child {
  font-size: 12px;
}
.session-row strong {
  color: var(--slate-800);
  font-size: 13px;
}
.session-result {
  display: grid;
  justify-items: end;
  gap: 1px;
}
.session-result b {
  color: var(--slate-800);
  font-size: 13px;
}
.session-result small {
  color: var(--slate-500);
  font-size: 12px;
}
.speed-trend {
  margin-top: 0;
}
.speed-basis {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 2px;
  margin-top: 14px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: color-mix(in oklch, var(--muted) 62%, transparent);
}
.speed-basis__button {
  min-width: 86px;
  color: var(--slate-500);
  font-size: 11px;
}
.speed-basis__button.active {
  background: var(--card);
  color: var(--primary-700);
  box-shadow: var(--shadow-sm);
}
.trend-summary {
  display: grid;
  justify-items: end;
  gap: 1px;
}
.trend-summary strong {
  color: var(--slate-900);
  font-size: 18px;
}
.trend-summary span {
  color: var(--slate-500);
  font-size: 12px;
}
.speed-trend :deep(.chart-panel) {
  padding-top: 3px;
}
.speed-trend__empty {
  display: grid;
  min-height: 250px;
  margin: 0;
  color: var(--slate-500);
  font-size: 12px;
  place-items: center;
}
.detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 10px;
}
.detail-heading > div:first-child > span {
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 600;
}
.detail-heading h2 {
  margin: 5px 0 0;
  font-size: 18px;
  line-height: 1.4;
}
.detail-heading p {
  margin: 4px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}
.detail-score {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 1px;
}
.detail-score strong {
  color: var(--slate-900);
  font-size: 20px;
}
.detail-score span {
  color: var(--slate-500);
  font-size: 12px;
}
.training-summary {
  margin: 10px 0 14px;
  padding: 13px 14px;
  border: 1px solid color-mix(in oklch, var(--primary-600) 24%, var(--border));
  border-left: 3px solid var(--primary-600);
  border-radius: var(--radius-sm);
  background: var(--active-selection-background);
}
.training-summary > span {
  color: var(--active-selection-foreground);
  font-size: 12px;
  font-weight: 600;
}
.training-summary p {
  margin: 6px 0 0;
  color: var(--active-selection-foreground);
  font-size: 13px;
  line-height: 1.6;
}
.question-results {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.question-results__table {
  min-width: 620px;
}
.question-results__head,
.question-results__row {
  display: grid;
  align-items: center;
  gap: 12px;
  grid-template-columns: minmax(210px, 1.5fr) 72px minmax(100px, 0.75fr) minmax(100px, 0.75fr);
}
.question-results__head {
  min-height: 38px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--slate-300);
  background: color-mix(in oklch, var(--muted) 42%, transparent);
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
}
.question-results__row {
  min-height: 50px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--slate-200);
  color: var(--slate-700);
  font-size: 12px;
}
.question-results__row:last-of-type {
  border-bottom: 0;
}
.question-results__question {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.45;
}
.question-results__question b {
  display: inline-grid;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  border-radius: 50%;
  background: var(--slate-100);
  color: var(--slate-600);
  font-size: 10px;
  place-items: center;
}
.question-results__status {
  width: fit-content;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
}
.question-results__status.is-correct {
  background: color-mix(in oklch, var(--success-600) 12%, transparent);
  color: var(--success-600);
}
.question-results__status.is-incorrect {
  background: color-mix(in oklch, var(--destructive) 10%, transparent);
  color: var(--destructive);
}
.question-results__empty {
  margin: 0;
  padding: 28px 16px;
  color: var(--slate-500);
  font-size: 12px;
  text-align: center;
}
.download-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 16px;
}
.training-history :deep(.gaze-analysis) {
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow-sm);
}
.download-button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid var(--slate-300);
  border-radius: 7px;
  background: var(--white);
  color: var(--primary-700);
  font-size: 12px;
  font-weight: 700;
}
.download-button:hover {
  border-color: var(--primary-400);
  background: var(--primary-50);
}
.download-button:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
.download-button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

@container (max-width: 850px) {
  .training-workspace {
    grid-template-columns: 1fr;
  }
}
</style>
