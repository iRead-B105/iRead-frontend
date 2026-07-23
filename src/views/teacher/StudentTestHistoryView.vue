<script setup lang="ts">
// 검사 날짜를 고르고 검사 결과를 비교하는 화면입니다.
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { EChartsOption } from 'echarts'
import ChartPanel from '@/components/common/ChartPanel.vue'
import GazeAnalysisPanel from '@/components/teacher/GazeAnalysisPanel.vue'
import HistoryToolbar from '@/components/teacher/HistoryToolbar.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { chartColors } from '@/features/teacher/chartTheme'
import { testApi, type TestComparison, type TestListItem } from '@/features/teacher/adminApi'

const route = useRoute()
const tests = ref<TestListItem[]>([])
const comparisonResult = ref<TestComparison>()
// 입력 요소와 연결할 값은 ref로 만들어 변경 사항이 화면에 즉시 반영되게 합니다.
const testDate = ref('2026-07-14')
const comparison = ref('2026-06-21')
const secondaryComparison = ref('2026-05-30')
const comparisonCount = ref(1)

async function loadComparison() {
  const current = tests.value.find((item) => item.date === testDate.value)
  const compareIds = [comparison.value, secondaryComparison.value]
    .slice(0, comparisonCount.value)
    .map((date) => tests.value.find((item) => item.date === date)?.testId)
    .filter((id): id is number => id !== undefined)
  if (!current || compareIds.length === 0) return
  comparisonResult.value = await testApi.compare(Number(route.params.id), current.testId, compareIds)
}

onMounted(async () => {
  tests.value = await testApi.list(Number(route.params.id))
  testDate.value = tests.value[0]?.date ?? ''
  comparison.value = tests.value[1]?.date ?? ''
  secondaryComparison.value = tests.value[2]?.date ?? ''
  await loadComparison()
})

watch([testDate, comparison, secondaryComparison, comparisonCount], () => void loadComparison())

function detailMetrics(detail?: TestComparison['currentTest']) {
  if (!detail) return [0, 0, 0, 0, 0, 0]
  const readingScore = Math.max(0, 100 - Math.min(100, detail.readingTimeSeconds / 3))
  const solvingScore = Math.max(0, 100 - Math.min(100, detail.solvingTimeSeconds / 3))
  const gazeScore = Math.max(0, 100 - detail.gazeDepartureCount * 5)
  return [readingScore, solvingScore, readingScore, detail.accuracy, gazeScore, detail.accuracy]
}

// computed를 사용해 관련 값이 바뀔 때 차트 설정도 다시 만들 수 있게 합니다.
const testChart = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis', valueFormatter: (value) => `${value}점` },
  legend: {
    data: [
      '선택 검사',
      '비교 검사',
      ...(comparisonCount.value > 1 ? ['추가 비교'] : []),
      '검사 평균',
    ],
    top: 4,
  },
  grid: { left: 52, right: 24, top: 50, bottom: 52 },
  xAxis: {
    type: 'category',
    data: ['시선 고정', '시선 도약', '읽기 속도', '정답률', '풀이 속도', '유창성'],
    axisLabel: { interval: 0, rotate: 16 },
  },
  yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}점' } },
  series: [
    {
      name: '선택 검사',
      type: 'bar',
      data: detailMetrics(comparisonResult.value?.currentTest),
      itemStyle: { color: chartColors.blue, borderRadius: [5, 5, 0, 0] },
    },
    {
      name: '비교 검사',
      type: 'bar',
      data: detailMetrics(comparisonResult.value?.comparisonTests[0]),
      itemStyle: { color: chartColors.green, borderRadius: [5, 5, 0, 0] },
    },
    ...(comparisonCount.value > 1
      ? [{
          name: '추가 비교',
          type: 'bar' as const,
          data: detailMetrics(comparisonResult.value?.comparisonTests[1]),
          itemStyle: { color: chartColors.amber, borderRadius: [5, 5, 0, 0] },
        }]
      : []),
    {
      name: '검사 평균',
      type: 'line',
      smooth: false,
      data: [28, 39, 56, 61, 42, 66],
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: chartColors.secondary, width: 2 },
      itemStyle: {
        color: chartColors.white,
        borderColor: chartColors.secondary,
        borderWidth: 2,
      },
      z: 5,
    },
  ],
}))
</script>

<template>
  <div class="test-history page-stack">
    <PageHeader
      title="테스트 이력"
      description="검사 결과를 선택하고 이전 검사와 비교합니다."
    />

    <Card class="toolbar-card">
      <HistoryToolbar>
        <div class="field date-field">
          <Label for="test-date">선택 검사</Label>
          <Input id="test-date" v-model="testDate" class="input" type="date" />
        </div>
        <div class="field date-field">
          <Label for="comparison-date">비교 검사 1</Label>
          <Input id="comparison-date" v-model="comparison" class="input" type="date" />
        </div>
        <div v-if="comparisonCount > 1" class="field date-field">
          <Label for="comparison-date-2">비교 검사 2</Label>
          <Input id="comparison-date-2" v-model="secondaryComparison" class="input" type="date" />
        </div>
        <Button
          variant="outline"
          class="add-comparison"
          type="button"
          :disabled="comparisonCount >= 2"
          @click="comparisonCount++"
        >
          비교 검사 추가
        </Button>
        <template #status>선택 검사 1건 · 비교 기준 {{ comparisonCount }}건</template>
      </HistoryToolbar>
    </Card>

    <div class="test-results">
      <Card class="result-chart">
        <header class="section-heading">
          <div>
            <h2>영역별 환산 점수</h2>
            <p>100점 기준으로 환산한 비교 결과입니다.</p>
          </div>
        </header>
        <ChartPanel :option="testChart" height="320px" aria-label="영역별 검사 결과 비교 차트" />
      </Card>

      <Card class="result-summary">
        <header class="summary-heading">
          <span>선택 검사 종합</span>
          <div><strong>76점</strong><small>이전 검사 대비 +12점</small></div>
        </header>
        <dl>
          <div>
            <dt>강점 영역</dt>
            <dd>유창성 · 정확도</dd>
          </div>
          <div>
            <dt>보완 영역</dt>
            <dd>시선 도약 · 풀이 속도</dd>
          </div>
          <div>
            <dt>권장 과정</dt>
            <dd>파닉스 심화 · 2단계</dd>
          </div>
          <div>
            <dt>다음 검사</dt>
            <dd>4주 후 권장</dd>
          </div>
        </dl>
      </Card>
    </div>

    <GazeAnalysisPanel
      title="선택 검사 시선 분석"
      description="시선 체류 시간, 되돌아보기 횟수와 읽기 이탈 구간을 선택 검사 기준으로 표시합니다."
    />

  </div>
</template>

<style scoped>
.test-history { gap: 20px; container-type: inline-size; }
.toolbar-card {
  gap: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.toolbar-card :deep(.history-toolbar) { min-height: 76px; padding: 14px 0; border-bottom: 0; }
.toolbar-card :deep(.history-toolbar__status) { align-self: flex-end; padding-bottom: 3px; }
.date-field { width: 166px; }
.add-comparison { min-height: 40px; }
.add-comparison:disabled { border-color: var(--slate-200); background: var(--slate-100); color: var(--slate-400); cursor: default; opacity: 1; transform: none; }
.test-results { display: grid; align-items: stretch; gap: 20px; grid-template-columns: minmax(0, 1fr) 320px; }
.result-chart,
.result-summary { border-radius: var(--radius-lg); }
.result-chart { min-width: 0; gap: 10px; padding: 20px; }
.result-summary { min-width: 0; gap: 0; padding: 20px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.section-heading h2 { margin: 0; font-size: 17px; }
.section-heading p { margin: 5px 0 0; color: var(--slate-500); font-size: 12px; }
.result-chart :deep(.chart-panel) { padding-top: 2px; }
.summary-heading { padding-bottom: 8px; }
.summary-heading > span { color: var(--slate-500); font-size: 12px; font-weight: 600; }
.summary-heading > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-top: 6px; }
.summary-heading strong { color: var(--slate-900); font-size: 28px; }
.summary-heading small { color: var(--slate-600); font-size: 12px; font-weight: 600; }
.result-summary dl { display: grid; gap: 8px; margin: 16px 0 0; }
.result-summary dl > div {
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 32%, transparent);
}
.result-summary dt { color: var(--slate-500); font-size: 12px; }
.result-summary dd { margin: 5px 0 0; color: var(--slate-800); font-size: 13px; font-weight: 700; }
.test-history :deep(.gaze-analysis) {
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow-sm);
}
@container (max-width: 850px) {
  .test-results { grid-template-columns: 1fr; }
  .result-summary { display: grid; align-items: start; gap: 28px; grid-template-columns: 220px minmax(0, 1fr); }
  .summary-heading > div { display: grid; justify-items: start; }
  .result-summary dl { margin: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@container (max-width: 720px) {
  .result-summary { gap: 24px; grid-template-columns: 1fr; }
  .result-summary dl { grid-template-columns: 1fr; }
}
</style>
