<script setup lang="ts">
// ECharts 전체가 아닌 실제 사용하는 차트·부품·렌더러만 가져와 최종 파일 크기를 줄입니다.
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsOption } from 'echarts'
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { twitterChartTheme } from '@/features/teacher/chartTheme'

const chartThemeName = 'iread-twitter'
echarts.registerTheme(chartThemeName, twitterChartTheme)

// 가져온 기능을 ECharts 엔진에 등록해야 실제 차트를 그릴 수 있습니다.
echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
  CanvasRenderer,
])

// option은 차트 데이터/모양 설정이고, 선택값인 높이와 접근성 문구에는 기본값을 줍니다.
const props = withDefaults(
  defineProps<{
    option: EChartsOption
    height?: string
    ariaLabel?: string
    summary?: string
    animated?: boolean
  }>(),
  { height: '320px', ariaLabel: '학습 데이터 차트', summary: undefined },
)

// template의 실제 div 요소, 생성된 차트, 크기 감시 도구를 각각 기억합니다.
const chartElement = ref<HTMLDivElement | null>(null)
const summaryId = `chart-summary-${useId()}`
let chart: ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let reducedMotionQuery: MediaQueryList | null = null

const reducedMotion = ref(false)

function renderChart() {
  // 아직 div가 화면에 만들어지지 않았다면 그릴 곳이 없으므로 종료합니다.
  if (!chartElement.value) return
  // ??=는 chart가 없을 때만 새 인스턴스를 만든다는 뜻이라 중복 생성을 방지합니다.
  chart ??= echarts.init(chartElement.value, chartThemeName)
  // 부모가 전달한 최신 설정으로 차트를 다시 그립니다.
  chart.setOption(
    { ...props.option, animation: Boolean(props.animated) && !reducedMotion.value },
    true,
  )
}

function updateReducedMotion(event: MediaQueryListEvent | MediaQueryList) {
  reducedMotion.value = event.matches
}

onMounted(async () => {
  // Vue가 실제 HTML을 만든 다음 차트를 그려야 정확한 크기를 계산할 수 있습니다.
  await nextTick()
  if (typeof window.matchMedia === 'function') {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    updateReducedMotion(reducedMotionQuery)
    reducedMotionQuery.addEventListener('change', updateReducedMotion)
  }
  renderChart()
  if (chartElement.value) {
    // 부모 영역 크기가 달라지면 차트도 빈 공간에 맞춰 다시 계산합니다.
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(chartElement.value)
  }
})

// option 객체 내부의 데이터까지 감시하여 부모의 값 변경을 즉시 차트에 반영합니다.
watch([() => props.option, () => props.animated, reducedMotion], renderChart, { deep: true })

onBeforeUnmount(() => {
  // 페이지를 떠날 때 감시와 차트 메모리를 정리해 누수를 막습니다.
  resizeObserver?.disconnect()
  reducedMotionQuery?.removeEventListener('change', updateReducedMotion)
  chart?.dispose()
})
</script>

<template>
  <figure class="chart-figure">
    <!-- ref 연결로 이 div가 chartElement.value에 담기며, role/aria-label은 차트 목적을 설명합니다. -->
    <div
      ref="chartElement"
      class="chart-panel"
      :style="{ height }"
      role="img"
      :aria-label="ariaLabel"
      :aria-describedby="summary ? summaryId : undefined"
    ></div>
    <figcaption v-if="summary" :id="summaryId" class="sr-only">
      {{ summary }}
    </figcaption>
  </figure>
</template>

<style scoped>
.chart-figure {
  width: 100%;
  min-width: 0;
  margin: 0;
}

.chart-panel {
  width: 100%;
  min-width: 0;
}
</style>
