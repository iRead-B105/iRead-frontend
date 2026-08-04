<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import ChartPanel from '@/components/common/ChartPanel.vue'
import { chartColors } from '@/features/teacher/chartTheme'
import {
  formatReportDate,
  formatReportMinutes,
  formatReportNumber,
  hasAlignedReportLearningMetrics,
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

type GrowthMetricKey = 'accuracy' | 'readingSpeed' | 'pronunciationScore'

interface GrowthMetricDefinition {
  readonly key: GrowthMetricKey
  readonly title: string
  readonly unit: string
  readonly color: string
  readonly max?: number
}

const metricDefinitions = computed<readonly GrowthMetricDefinition[]>(() => [
  { key: 'accuracy', title: '읽기 정확도', unit: '%', color: chartColors.blue, max: 100 },
  {
    key: 'readingSpeed',
    title: '읽기 속도',
    unit: readingSpeedUnit.value || '단어/분',
    color: chartColors.green,
  },
  { key: 'pronunciationScore', title: '발음 점수', unit: '점', color: chartColors.amber, max: 100 },
])

const alignedLearningMetrics = computed(() => hasAlignedReportLearningMetrics(props.snapshot))

const growthCards = computed(() =>
  metricDefinitions.value.map((definition) => {
    const points = props.snapshot.growthHistory.filter((point) => point[definition.key] !== null)
    const option: EChartsOption = {
      animation: false,
      tooltip: { trigger: 'axis' },
      grid: { left: 44, right: 18, top: 24, bottom: 34 },
      xAxis: {
        type: 'category',
        data: points.map((point) => formatReportDate(point.date)),
        axisLabel: { fontSize: 9 },
      },
      yAxis: {
        type: 'value',
        name: definition.unit,
        min: 0,
        ...(definition.max === undefined ? {} : { max: definition.max }),
        axisLabel: { fontSize: 9 },
      },
      series: [
        {
          name: definition.title,
          type: 'line',
          connectNulls: false,
          data: points.map((point) => point[definition.key]),
          lineStyle: { color: definition.color, width: 2 },
          itemStyle: { color: definition.color },
        },
      ],
    }
    return {
      ...definition,
      option,
      pointCount: points.length,
      summary: points.length
        ? `${definition.title} 추이: ${points
            .map(
              (point) =>
                `${formatReportDate(point.date)} ${formatReportNumber(point[definition.key], definition.unit)}`,
            )
            .join('; ')}`
        : `${definition.title} 기록이 없습니다.`,
    }
  }),
)

const participationItems = computed(() => [
  { label: '학습일', value: `${props.snapshot.learningDays}일` },
  { label: '총 훈련 시간', value: formatReportMinutes(props.snapshot.totalTrainingTimeMinutes) },
  { label: '완료 훈련', value: `${props.snapshot.completedTrainingCount}회` },
])
const performanceItems = computed(() => [
  { label: '평균 정확도', value: formatReportNumber(props.snapshot.averageAccuracy, '%') },
  {
    label: '평균 읽기 속도',
    value:
      props.snapshot.averageReadingSpeed === null
        ? '-'
        : `${formatReportNumber(props.snapshot.averageReadingSpeed)} ${readingSpeedUnit.value}`.trim(),
  },
])
</script>

<template>
  <section class="snapshot-section" aria-labelledby="participation-summary-title">
    <header class="section-heading">
      <h2 id="participation-summary-title">학습 참여 요약</h2>
    </header>
    <dl class="summary-grid summary-grid--participation">
      <div v-for="item in participationItems" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  </section>

  <section class="snapshot-section" aria-labelledby="performance-summary-title">
    <header class="section-heading">
      <h2 id="performance-summary-title">핵심 성과 요약</h2>
    </header>
    <div v-if="!alignedLearningMetrics" class="metric-pending" role="status">
      <strong>정확도·읽기 속도 계산 기준 연동 예정</strong>
      <p>
        학습 현황과 같은 단어별 점수 평균 및 분당 정답 단어 수 기준이 확인되기 전에는 이전 기준 값을
        표시하지 않습니다.
      </p>
    </div>
    <dl v-else class="summary-grid summary-grid--performance">
      <div v-for="item in performanceItems" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  </section>

  <section class="snapshot-section" aria-labelledby="growth-history-title">
    <header class="section-heading">
      <h2 id="growth-history-title">기간별 성장 추이</h2>
    </header>
    <div v-if="!alignedLearningMetrics" class="metric-pending" role="status">
      <strong>성장 그래프 데이터 연동 예정</strong>
      <p>통일된 계산 결과가 제공되면 정확도·읽기 속도·발음 점수를 각각 표시합니다.</p>
    </div>
    <div v-else class="growth-grid">
      <article v-for="metric in growthCards" :key="metric.key" class="growth-card">
        <header>
          <h3>{{ metric.title }}</h3>
          <span>{{ metric.pointCount }}일</span>
        </header>
        <p v-if="metric.pointCount === 0" class="empty-state">표시할 기록이 없습니다.</p>
        <ChartPanel
          v-else
          :option="metric.option"
          height="220px"
          :aria-label="`보고서 기간별 ${metric.title} 추이`"
          :summary="metric.summary"
        />
      </article>
    </div>
  </section>

  <section class="snapshot-section" aria-labelledby="automatic-analysis-title">
    <header class="section-heading">
      <h2 id="automatic-analysis-title">자동 분석</h2>
    </header>
    <div v-if="!alignedLearningMetrics" class="metric-pending" role="status">
      <strong>규칙 기반 자동 분석 연동 예정</strong>
      <p>
        Backend 계산이 준비되면 향상 항목과 지속 관찰 항목을 보고서 생성 시점 기준으로 표시합니다.
      </p>
    </div>
    <div v-else class="analysis-grid">
      <article>
        <h3>향상 항목</h3>
        <ul v-if="snapshot.improvedPatterns.length">
          <li v-for="pattern in snapshot.improvedPatterns" :key="pattern">{{ pattern }}</li>
        </ul>
        <p v-else class="analysis-empty">비교할 향상 기록이 부족합니다.</p>
      </article>
      <article>
        <h3>지속 관찰 항목</h3>
        <ul v-if="snapshot.persistentDifficultyPatterns.length">
          <li v-for="pattern in snapshot.persistentDifficultyPatterns" :key="pattern">
            {{ pattern }}
          </li>
        </ul>
        <p v-else class="analysis-empty">지속적으로 확인된 어려움이 없습니다.</p>
      </article>
    </div>
  </section>

  <section class="snapshot-section" aria-labelledby="area-achievement-title">
    <header class="section-heading">
      <h2 id="area-achievement-title">커리큘럼 영역별 성취도</h2>
    </header>
    <p v-if="snapshot.areaAchievements.length === 0" class="empty-state">
      표시할 영역별 성취도가 없습니다.
    </p>
    <div v-else class="table-wrap">
      <table>
        <caption class="sr-only">
          영역별 성취도
        </caption>
        <thead>
          <tr>
            <th>영역</th>
            <th>성취도</th>
          </tr>
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
      <h2 id="incorrect-words-title">자주 틀린 단어와 오답률</h2>
    </header>
    <p v-if="snapshot.frequentlyIncorrectWords.length === 0" class="empty-state">
      표시할 낱말 기록이 없습니다.
    </p>
    <div v-else class="table-wrap">
      <table>
        <caption class="sr-only">
          자주 틀리는 낱말과 오답률
        </caption>
        <thead>
          <tr>
            <th>낱말</th>
            <th>시도</th>
            <th>오답</th>
            <th>오답률</th>
          </tr>
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
}
.summary-grid--participation {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.summary-grid--performance {
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
.metric-pending {
  display: grid;
  min-height: 96px;
  padding: 18px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 35%, transparent);
  place-content: center;
  text-align: center;
}
.metric-pending strong {
  color: var(--foreground);
  font-size: 13px;
}
.metric-pending p {
  max-width: 620px;
  margin: 7px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.6;
}
.growth-grid,
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.growth-card,
.analysis-grid article {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.growth-card > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.growth-card h3,
.analysis-grid h3 {
  margin: 0;
  font-size: 13px;
}
.growth-card header span {
  color: var(--muted-foreground);
  font-size: 11px;
}
.analysis-grid ul {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--foreground);
  font-size: 12px;
  line-height: 1.55;
}
.analysis-empty {
  margin: 12px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
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
@media (max-width: 760px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .growth-grid,
  .analysis-grid {
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
