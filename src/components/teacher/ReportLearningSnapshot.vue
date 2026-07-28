<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import ChartPanel from '@/components/common/ChartPanel.vue'
import { chartColors } from '@/features/teacher/chartTheme'
import {
  formatReportDate,
  formatReportMinutes,
  formatReportNumber,
  type ReportSnapshot,
} from '@/features/teacher/report'

const props = defineProps<{
  snapshot: ReportSnapshot
}>()

const readingSpeedUnit = computed(() => {
  if (!props.snapshot.readingSpeedUnit) return ''
  return props.snapshot.readingSpeedUnit === 'CORRECT_WORDS_PER_MINUTE'
    ? '단어/분'
    : props.snapshot.readingSpeedUnit
})

const growthChart = computed<EChartsOption>(() => ({
  animation: false,
  tooltip: { trigger: 'axis' },
  legend: {
    data: ['정확도', '읽기 속도', '발음 점수'],
    top: 0,
    textStyle: { fontSize: 10 },
  },
  grid: { left: 44, right: 44, top: 38, bottom: 34 },
  xAxis: {
    type: 'category',
    data: props.snapshot.growthHistory.map((point) => formatReportDate(point.date)),
    axisLabel: { fontSize: 9 },
  },
  yAxis: [
    {
      type: 'value',
      name: '점수',
      min: 0,
      max: 100,
      axisLabel: { fontSize: 9 },
    },
    {
      type: 'value',
      name: readingSpeedUnit.value || '읽기 속도',
      min: 0,
      axisLabel: { fontSize: 9 },
    },
  ],
  series: [
    {
      name: '정확도',
      type: 'line',
      connectNulls: false,
      data: props.snapshot.growthHistory.map((point) => point.accuracy),
      lineStyle: { color: chartColors.blue, width: 2 },
      itemStyle: { color: chartColors.blue },
    },
    {
      name: '읽기 속도',
      type: 'line',
      yAxisIndex: 1,
      connectNulls: false,
      data: props.snapshot.growthHistory.map((point) => point.readingSpeed),
      lineStyle: { color: chartColors.green, width: 2 },
      itemStyle: { color: chartColors.green },
    },
    {
      name: '발음 점수',
      type: 'line',
      connectNulls: false,
      data: props.snapshot.growthHistory.map((point) => point.pronunciationScore),
      lineStyle: { color: chartColors.amber, width: 2 },
      itemStyle: { color: chartColors.amber },
    },
  ],
}))

const summaryItems = computed(() => [
  { label: '학습일', value: `${props.snapshot.learningDays}일` },
  { label: '총 훈련 시간', value: formatReportMinutes(props.snapshot.totalTrainingTimeMinutes) },
  { label: '완료 훈련', value: `${props.snapshot.completedTrainingCount}회` },
  { label: '평균 정확도', value: formatReportNumber(props.snapshot.averageAccuracy, '%') },
  {
    label: '평균 읽기 속도',
    value:
      props.snapshot.averageReadingSpeed === null
        ? '-'
        : `${formatReportNumber(props.snapshot.averageReadingSpeed)} ${readingSpeedUnit.value}`.trim(),
  },
])
const growthChartSummary = computed(
  () =>
    `기간별 성장 기록: ${props.snapshot.growthHistory
      .map(
        (point) =>
          `${formatReportDate(point.date)} 정확도 ${formatReportNumber(point.accuracy, '%')}, 읽기 속도 ${formatReportNumber(point.readingSpeed, readingSpeedUnit.value)}, 발음 점수 ${formatReportNumber(point.pronunciationScore)}`,
      )
      .join('; ')}`,
)
</script>

<template>
  <section class="snapshot-section" aria-labelledby="report-summary-title">
    <header class="section-heading">
      <h2 id="report-summary-title">학습 요약</h2>
      <p>보고서 생성 시점에 저장된 기간 내 학습 결과입니다.</p>
    </header>
    <dl class="summary-grid">
      <div v-for="item in summaryItems" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  </section>

  <section class="snapshot-section" aria-labelledby="growth-history-title">
    <header class="section-heading">
      <h2 id="growth-history-title">기간별 성장 기록</h2>
      <p>자료가 없는 지점은 임의 값으로 연결하지 않습니다.</p>
    </header>
    <p v-if="snapshot.growthHistory.length === 0" class="empty-state">
      표시할 성장 기록이 없습니다.
    </p>
    <ChartPanel
      v-else
      :option="growthChart"
      height="260px"
      aria-label="보고서 기간별 정확도, 읽기 속도와 발음 점수 추이"
      :summary="growthChartSummary"
    />
  </section>

  <section class="snapshot-section" aria-labelledby="area-achievement-title">
    <header class="section-heading">
      <h2 id="area-achievement-title">영역별 성취도</h2>
    </header>
    <p v-if="snapshot.areaAchievements.length === 0" class="empty-state">
      표시할 영역별 성취도가 없습니다.
    </p>
    <div v-else class="table-wrap">
      <table>
        <caption class="sr-only">영역별 성취도</caption>
        <thead>
          <tr><th>영역</th><th>성취도</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in snapshot.areaAchievements" :key="item.area">
            <th>{{ item.area }}</th>
            <td>{{ formatReportNumber(item.achievement, '%') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="snapshot-section" aria-labelledby="incorrect-words-title">
    <header class="section-heading">
      <h2 id="incorrect-words-title">자주 틀리는 낱말</h2>
    </header>
    <p v-if="snapshot.frequentlyIncorrectWords.length === 0" class="empty-state">
      표시할 낱말 기록이 없습니다.
    </p>
    <div v-else class="table-wrap">
      <table>
        <caption class="sr-only">자주 틀리는 낱말과 오답률</caption>
        <thead>
          <tr><th>낱말</th><th>시도</th><th>오답</th><th>오답률</th></tr>
        </thead>
        <tbody>
          <tr v-for="word in snapshot.frequentlyIncorrectWords" :key="word.wordId">
            <th>{{ word.wordName }}</th>
            <td>{{ word.attemptCount }}회</td>
            <td>{{ word.incorrectCount }}회</td>
            <td>{{ formatReportNumber(word.incorrectRate, '%') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="snapshot-section pattern-grid" aria-label="학습 패턴">
    <div>
      <header class="section-heading">
        <h2>개선된 패턴</h2>
      </header>
      <p v-if="snapshot.improvedPatterns.length === 0" class="empty-state">
        표시할 개선 패턴이 없습니다.
      </p>
      <ul v-else>
        <li v-for="pattern in snapshot.improvedPatterns" :key="pattern">{{ pattern }}</li>
      </ul>
    </div>
    <div>
      <header class="section-heading">
        <h2>지속적으로 어려운 패턴</h2>
      </header>
      <p v-if="snapshot.persistentDifficultyPatterns.length === 0" class="empty-state">
        표시할 어려움 패턴이 없습니다.
      </p>
      <ul v-else>
        <li v-for="pattern in snapshot.persistentDifficultyPatterns" :key="pattern">
          {{ pattern }}
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.snapshot-section {
  padding-top: 26px;
}
.snapshot-section + .snapshot-section {
  margin-top: 20px;
}
.section-heading {
  margin-bottom: 14px;
}
.section-heading h2 {
  margin: 0;
  font-size: 17px;
}
.section-heading p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 11px;
}
.summary-grid {
  display: grid;
  margin: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
.summary-grid > div {
  padding: 14px 12px;
}
.summary-grid > div + div {
  border-left: 1px solid var(--border);
}
dt {
  color: var(--muted-foreground);
  font-size: 11px;
}
dd {
  margin: 5px 0 0;
  font-size: 17px;
  font-weight: 750;
}
.empty-state {
  display: grid;
  min-height: 96px;
  margin: 0;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--muted-foreground);
  font-size: 12px;
  place-items: center;
}
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
}
th,
td {
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  text-align: left;
}
thead th {
  color: var(--muted-foreground);
  font-weight: 600;
}
tbody th {
  font-weight: 700;
}
.pattern-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.pattern-grid ul {
  display: grid;
  margin: 0;
  padding: 14px 14px 14px 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;
}
@media (max-width: 760px) {
  .summary-grid,
  .pattern-grid {
    grid-template-columns: 1fr;
  }
  .summary-grid > div + div {
    border-top: 1px solid var(--border);
    border-left: 0;
  }

  .table-wrap {
    overscroll-behavior-x: contain;
  }
}
</style>
