<script setup lang="ts">
import { computed } from 'vue'

interface LearningTrendPoint {
  readonly date: string
  readonly label: string
  readonly value: number
}

const props = withDefaults(
  defineProps<{
    points: readonly LearningTrendPoint[]
    unit: string
    color: string
    maxValue?: number
    ariaLabel: string
  }>(),
  { maxValue: undefined },
)

const plotWidth = 644
const plotHeight = 256

const chartMax = computed(() => {
  if (props.maxValue !== undefined) return props.maxValue
  const highest = Math.max(...props.points.map((point) => point.value), 1)
  const interval = highest <= 50 ? 10 : Math.ceil(highest / 5 / 10) * 10
  return Math.max(interval * 5, 10)
})

const coordinates = computed(() =>
  props.points.map((point, index) => {
    const xPercent = props.points.length === 1 ? 50 : (100 * index) / (props.points.length - 1)
    const yPercent = 100 * (1 - Math.min(point.value, chartMax.value) / chartMax.value)
    return { ...point, xPercent, yPercent }
  }),
)

const segments = computed(() =>
  coordinates.value.slice(0, -1).map((point, index) => {
    const next = coordinates.value[index + 1]!
    const deltaX = ((next.xPercent - point.xPercent) / 100) * plotWidth
    const deltaY = ((next.yPercent - point.yPercent) / 100) * plotHeight
    return {
      left: point.xPercent,
      top: point.yPercent,
      width: (Math.hypot(deltaX, deltaY) / plotWidth) * 100,
      angle: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
    }
  }),
)

const ticks = computed(() =>
  Array.from({ length: 6 }, (_, index) => {
    const value = (chartMax.value * (5 - index)) / 5
    return {
      value: Number.isInteger(value) ? value : Number(value.toFixed(1)),
      top: index * 20,
    }
  }),
)

function shortDate(date: string): string {
  return date.slice(5).replace('-', '.')
}
</script>

<template>
  <div class="learning-trend-chart" role="img" :aria-label="ariaLabel">
    <div class="chart-plot">
      <div
        v-for="tick in ticks"
        :key="tick.value"
        class="chart-grid-line"
        :style="{ top: `${tick.top}%` }"
      >
        <span>{{ tick.value }}{{ unit }}</span>
      </div>

      <div
        v-for="(segment, index) in segments"
        :key="`segment-${index}`"
        class="chart-segment"
        :style="{
          left: `${segment.left}%`,
          top: `${segment.top}%`,
          width: `${segment.width}%`,
          backgroundColor: color,
          transform: `rotate(${segment.angle}deg)`,
        }"
      />

      <div
        v-for="(point, index) in coordinates"
        :key="`${point.date}:${index}`"
        class="chart-point-wrap"
        :style="{ left: `${point.xPercent}%`, top: `${point.yPercent}%` }"
      >
        <button
          type="button"
          class="chart-point"
          :style="{ backgroundColor: color }"
          :aria-label="`${point.date} ${point.label} ${point.value}${unit}`"
        >
          <span class="chart-tooltip">
            <small>{{ point.date }}</small>
            <span>
              <strong>{{ point.label }}</strong>
              <b>{{ point.value }}{{ unit }}</b>
            </span>
          </span>
        </button>
        <span class="chart-date">{{ shortDate(point.date) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.learning-trend-chart {
  position: relative;
  width: 100%;
  height: 320px;
  min-width: 0;
  padding: 22px 22px 42px 54px;
}

.chart-plot {
  position: relative;
  width: 100%;
  height: 100%;
}

.chart-grid-line {
  position: absolute;
  right: 0;
  left: 0;
  height: 1px;
  background: #e2e8f0;
}

.chart-grid-line > span {
  position: absolute;
  left: -10px;
  color: #64748b;
  font-size: 11px;
  white-space: nowrap;
  transform: translate(-100%, -50%);
}

.chart-segment {
  position: absolute;
  z-index: 1;
  height: 3px;
  border-radius: 999px;
  transform-origin: left center;
}

.chart-point-wrap {
  position: absolute;
  z-index: 2;
  transform: translate(-50%, -50%);
}

.chart-point {
  position: relative;
  display: block;
  width: 12px;
  height: 12px;
  padding: 0;
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12);
  cursor: pointer;
}

.chart-point:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--ring) 42%, transparent);
  outline-offset: 2px;
}

.chart-date {
  position: absolute;
  top: calc(100% + 18px);
  left: 50%;
  color: #64748b;
  font-size: 11px;
  white-space: nowrap;
  transform: translateX(-50%);
}

.chart-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  z-index: 4;
  display: none;
  min-width: 210px;
  padding: 11px 13px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
  color: #0f172a;
  pointer-events: none;
  text-align: left;
  transform: translateX(-50%);
}

.chart-point:hover .chart-tooltip,
.chart-point:focus-visible .chart-tooltip {
  display: block;
}

.chart-tooltip > small {
  display: block;
  margin-bottom: 7px;
  color: #64748b;
  font-size: 11px;
  font-weight: 650;
}

.chart-tooltip > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 7px;
  border-top: 1px solid #f1f5f9;
  font-size: 12px;
}

.chart-tooltip strong {
  color: #475569;
}

.chart-tooltip b {
  white-space: nowrap;
}
</style>
