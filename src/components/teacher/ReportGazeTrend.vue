<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import ChartPanel from '@/components/common/ChartPanel.vue'
import { chartColors } from '@/features/teacher/chartTheme'
import {
  formatGazeChange,
  formatGazeCount,
  formatGazeDuration,
  formatReportDateTime,
  type ReportGazePoint,
  type ReportGazeSeries,
  type ReportGazeTrend,
} from '@/features/teacher/report'

defineProps<{
  trend: ReportGazeTrend
  showAutomaticAnalysis: boolean
}>()

const seriesSections = [
  { key: 'training', title: '훈련 시선 추이', source: '훈련' },
  { key: 'test', title: '검사 시선 추이', source: '검사' },
] as const

const metrics = [
  {
    key: 'totalVisitedDurationMs',
    label: '총 체류 시간',
    color: chartColors.blue,
    kind: 'duration',
  },
  {
    key: 'avgVisitedDurationMs',
    label: '평균 체류 시간',
    color: chartColors.green,
    kind: 'duration',
  },
  {
    key: 'totalVisitedCount',
    label: '총 체류 횟수',
    color: chartColors.amber,
    kind: 'count',
  },
  {
    key: 'reverseReadCount',
    label: '되돌아보기 횟수',
    color: chartColors.red,
    kind: 'count',
  },
] as const

type Metric = (typeof metrics)[number]

function metricValue(point: ReportGazePoint | undefined, metric: Metric): string {
  if (!point) return '-'
  const value = point[metric.key]
  return metric.kind === 'duration' ? formatGazeDuration(value) : formatGazeCount(value)
}

function chartOption(series: ReportGazeSeries, metric: Metric): EChartsOption {
  return {
    animation: false,
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) =>
        metric.kind === 'duration'
          ? formatGazeDuration(typeof value === 'number' ? value : null)
          : formatGazeCount(typeof value === 'number' ? value : null),
    },
    grid: { left: 44, right: 16, top: 18, bottom: 34 },
    xAxis: {
      type: 'category',
      data: series.points.map((point) => formatReportDateTime(point.analyzedAt)),
      axisLabel: { fontSize: 8, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        fontSize: 8,
        formatter: metric.kind === 'duration' ? (value: number) => `${value / 1_000}s` : '{value}',
      },
    },
    series: [
      {
        name: metric.label,
        type: 'line',
        connectNulls: false,
        symbol: 'circle',
        symbolSize: 6,
        data: series.points.map((point) => point[metric.key]),
        lineStyle: { color: metric.color, width: 2 },
        itemStyle: { color: metric.color },
      },
    ],
  }
}

function chartSummary(series: ReportGazeSeries, metric: Metric, source: string): string {
  return `${source} ${metric.label}: ${series.points
    .map((point) => `${formatReportDateTime(point.analyzedAt)} ${metricValue(point, metric)}`)
    .join(', ')}`
}

function statusLabel(status: ReportGazeSeries['status']): string {
  if (status === 'AVAILABLE') return '분석 완료'
  if (status === 'NO_DATA') return '데이터 없음'
  return '분석 실패'
}
</script>

<template>
  <section class="gaze-trend" aria-labelledby="report-gaze-title">
    <header class="gaze-trend__heading">
      <div>
        <h2 id="report-gaze-title">훈련·검사 시선 분석 추이</h2>
      </div>
      <span>집계 {{ formatReportDateTime(trend.generatedAt) }}</span>
    </header>

    <section
      v-for="section in seriesSections"
      :key="section.key"
      class="gaze-series"
      :aria-labelledby="`gaze-${section.key}-title`"
    >
      <header>
        <div>
          <h3 :id="`gaze-${section.key}-title`">{{ section.title }}</h3>
          <p>{{ trend[section.key].points.length }}건의 성공 결과</p>
        </div>
        <span class="series-status">{{ statusLabel(trend[section.key].status) }}</span>
      </header>

      <div v-if="trend[section.key].status === 'NO_DATA'" class="series-empty">
        시선 분석 데이터가 없습니다.
      </div>
      <div
        v-else-if="trend[section.key].status === 'FAILED'"
        class="series-empty series-empty--error"
      >
        시선 분석을 완료하지 못했습니다.
      </div>
      <template v-else>
        <dl class="gaze-metrics">
          <div v-for="metric in metrics" :key="metric.key">
            <dt>{{ metric.label }}</dt>
            <dd>{{ metricValue(trend[section.key].points.at(-1), metric) }}</dd>
            <small>
              {{
                trend[section.key].comparisonAvailable
                  ? formatGazeChange(trend[section.key].changes?.[metric.key], metric.kind)
                  : '현재 결과'
              }}
            </small>
          </div>
        </dl>

        <p v-if="!trend[section.key].comparisonAvailable" class="comparison-notice">
          변화를 비교하려면 두 건 이상의 결과가 필요합니다.
        </p>

        <div v-else class="gaze-charts">
          <article v-for="metric in metrics" :key="metric.key">
            <h4>{{ metric.label }}</h4>
            <ChartPanel
              :option="chartOption(trend[section.key], metric)"
              height="190px"
              :aria-label="`${section.source} ${metric.label} 시간순 추이`"
              :summary="chartSummary(trend[section.key], metric, section.source)"
            />
          </article>
        </div>

        <ul
          v-if="showAutomaticAnalysis && trend[section.key].descriptions.length"
          class="gaze-descriptions"
        >
          <li v-for="description in trend[section.key].descriptions" :key="description">
            {{ description }}
          </li>
        </ul>
        <p
          v-else-if="!showAutomaticAnalysis && trend[section.key].descriptions.length"
          class="comparison-notice"
        >
          시선 자동 분석 문구는 규칙 기반 Backend 연동 후 제공됩니다.
        </p>
        <p v-if="trend[section.key].failedSessionCount > 0" class="failed-sessions">
          집계값이 없는 실패 세션 {{ trend[section.key].failedSessionCount }}건은 추이에서
          제외했습니다.
        </p>
      </template>
    </section>

    <p class="diagnostic-notice">
      시선 지표는 학습 과정 참고용이며 의학적·임상적 진단 결과가 아닙니다.
    </p>
  </section>
</template>

<style scoped>
.gaze-trend {
  padding-top: 28px;
}
.gaze-trend__heading,
.gaze-series > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.gaze-trend__heading h2,
.gaze-series h3,
.gaze-charts h4 {
  margin: 0;
}
.gaze-trend__heading h2 {
  font-size: 17px;
}
.gaze-trend__heading p,
.gaze-series header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 11px;
}
.gaze-trend__heading > span {
  color: var(--muted-foreground);
  font-size: 10px;
}
.gaze-series {
  margin-top: 18px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.gaze-series h3 {
  font-size: 14px;
}
.series-status {
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 9px;
  font-weight: 750;
}
.series-empty {
  display: grid;
  min-height: 112px;
  margin-top: 12px;
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 45%, transparent);
  color: var(--muted-foreground);
  font-size: 12px;
  place-items: center;
}
.series-empty--error {
  color: var(--destructive);
}
.gaze-metrics {
  display: grid;
  margin: 14px 0 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.gaze-metrics > div {
  padding: 11px 12px;
}
.gaze-metrics > div + div {
  border-left: 1px solid var(--border);
}
.gaze-metrics dt,
.gaze-metrics small {
  color: var(--muted-foreground);
  font-size: 10px;
}
.gaze-metrics dd {
  margin: 4px 0 2px;
  font-size: 15px;
  font-weight: 750;
}
.comparison-notice,
.failed-sessions,
.diagnostic-notice {
  margin: 12px 0 0;
  color: var(--muted-foreground);
  font-size: 11px;
}
.gaze-charts {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.gaze-charts article {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.gaze-charts h4 {
  font-size: 11px;
}
.gaze-descriptions {
  display: grid;
  margin: 14px 0 0;
  padding: 12px 12px 12px 28px;
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 42%, transparent);
  gap: 6px;
  font-size: 11px;
  line-height: 1.55;
}
.diagnostic-notice {
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
@media (max-width: 760px) {
  .gaze-metrics,
  .gaze-charts {
    grid-template-columns: 1fr;
  }
  .gaze-metrics > div + div {
    border-top: 1px solid var(--border);
    border-left: 0;
  }
}

@media (max-width: 480px) {
  .gaze-trend__heading,
  .gaze-series > header {
    align-items: flex-start;
    flex-direction: column;
  }

  .gaze-series {
    padding: 14px;
  }
}
</style>
