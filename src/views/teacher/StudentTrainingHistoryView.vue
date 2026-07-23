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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { chartColors } from '@/features/teacher/chartTheme'
import { studentApi } from '@/features/teacher/adminApi'
import type { TrainingSession } from '@/features/teacher/types'

const route = useRoute()
const trainingSessions = ref<TrainingSession[]>([])
// 첫 훈련을 기본 선택하며 데이터가 비어 있으면 id 1을 임시 기본값으로 씁니다.
const selectedSessionId = ref(1)
const period = ref('최근 30일')
// 선택 id가 바뀔 때 해당 훈련 객체를 다시 찾아 오른쪽 상세 내용도 갱신합니다.
const selectedSession = computed(() =>
  trainingSessions.value.find((session) => session.id === selectedSessionId.value),
)

onMounted(async () => {
  const history = await studentApi.trainingHistory(Number(route.params.id))
  trainingSessions.value = history.map((item, index) => ({
    id: index + 1,
    title: item.learningType,
    date: item.finishedAt,
    achievement: Number(item.achievement ?? 0),
    curriculum: item.learningType,
    summary: `${item.date} 학습 기록`,
  }))
  selectedSessionId.value = trainingSessions.value[0]?.id ?? 1
})

// 날짜별 분당 읽은 단어 수를 선 그래프로 표현하는 ECharts 설정입니다.
const speedChart: EChartsOption = {
  tooltip: { trigger: 'axis', valueFormatter: (value) => `${value}단어/분` },
  grid: { left: 48, right: 24, top: 28, bottom: 34 },
  xAxis: {
    type: 'category',
    data: ['5/1', '5/5', '5/8', '5/12', '5/15', '5/19', '5/22', '5/26', '5/29'],
  },
  yAxis: { type: 'value', min: 60, max: 180 },
  series: [
    {
      name: '읽기 속도',
      type: 'line',
      smooth: false,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 5,
      data: [98, 126, 84, 151, 114, 148, 102, 128, 164],
      lineStyle: { color: chartColors.blue, width: 2.5 },
      itemStyle: {
        color: chartColors.white,
        borderColor: chartColors.blue,
        borderWidth: 2,
      },
    },
  ],
}

function formatSessionDate(value: string) {
  const [date = '', time = ''] = value.split(' ')
  const [, month = '01', day = '01'] = date.split('-')
  return `${Number(month)}월 ${Number(day)}일 ${time}`
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
    ['소리 구분 정확도', `${session.achievement}%`],
    ['낱말 읽기 정확도', `${Math.max(50, session.achievement - 8)}%`],
    ['문장 읽기 정확도', `${Math.max(50, session.achievement - 16)}%`],
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

  const activities = ['소리 구분', '낱말 읽기', '문장 읽기'].map((name, index) => {
    const accuracy = Math.max(50, session.achievement - index * 8)
    return {
      name,
      questionCount: 8 + index * 2,
      durationMinutes: 10 + index * 3,
      accuracy,
      status: getLearningStatus(accuracy),
    }
  })
  const json = JSON.stringify(
    {
      trainingId: session.id,
      title: session.title,
      curriculum: session.curriculum,
      completedAt: session.date,
      achievement: session.achievement,
      status: getLearningStatus(session.achievement),
      summary: session.summary,
      activities,
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
              <span>학습일</span><span>커리큘럼</span><span>결과</span>
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
              <p>분당 정확하게 읽은 단어 수</p>
            </div>
            <div class="trend-summary">
              <strong>+18%</strong>
              <span>기간 시작 대비</span>
            </div>
          </header>
          <ChartPanel :option="speedChart" height="250px" aria-label="읽기 속도 추이 차트" />
        </Card>
      </div>

      <Card class="training-detail">
        <div class="detail-filter">
          <div class="detail-filter__field">
            <Label for="training-period">조회 기간</Label>
            <Select v-model="period">
              <SelectTrigger id="training-period" class="select !h-9 !w-[148px] px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="최근 30일">최근 30일</SelectItem>
                <SelectItem value="최근 3개월">최근 3개월</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span>{{ period }} · 훈련 {{ trainingSessions.length }}건</span>
        </div>

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

        <div class="detail-list">
          <article v-for="(label, index) in ['소리 구분', '낱말 읽기', '문장 읽기']" :key="label">
            <div>
              <strong>{{ label }}</strong>
              <p>{{ 8 + index * 2 }}개 문항 · {{ 10 + index * 3 }}분 학습</p>
            </div>
            <span>
              <b>{{ Math.max(50, (selectedSession?.achievement ?? 0) - index * 8) }}%</b>
              <small>{{
                getLearningStatus(Math.max(50, (selectedSession?.achievement ?? 0) - index * 8))
              }}</small>
            </span>
          </article>
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
.detail-filter {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.detail-filter__field {
  display: grid;
  gap: 6px;
}
.detail-filter label {
  color: var(--slate-600);
  font-size: 11px;
  font-weight: 700;
}
.detail-filter > span {
  padding-bottom: 9px;
  color: var(--slate-500);
  font-size: 11px;
  white-space: nowrap;
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
  overflow: hidden;
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
  min-height: 40px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--slate-300);
  background: color-mix(in oklch, var(--muted) 42%, transparent);
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
.detail-list {
  display: grid;
  gap: 8px;
}
.detail-list article {
  display: grid;
  min-height: 66px;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 30%, transparent);
  grid-template-columns: minmax(0, 1fr) auto;
}
.detail-list strong {
  color: var(--slate-800);
  font-size: 13px;
}
.detail-list p {
  margin: 4px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}
.detail-list article > span {
  display: grid;
  justify-items: end;
  gap: 1px;
}
.detail-list article > span b {
  color: var(--slate-800);
  font-size: 13px;
}
.detail-list article > span small {
  color: var(--slate-500);
  font-size: 12px;
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
