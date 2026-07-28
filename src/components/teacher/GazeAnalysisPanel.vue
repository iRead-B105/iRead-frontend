<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  formatGazeAverage,
  formatGazeCount,
  formatGazeDuration,
  type GazeAnalysisRequestStatus,
  type GazeAnalysisState,
} from '@/features/teacher/gaze'

const props = withDefaults(
  defineProps<{
    title?: string
    state: GazeAnalysisState | null
    status: GazeAnalysisRequestStatus
    error?: string | null
    compact?: boolean
  }>(),
  {
    title: '시선 분석',
    error: null,
    compact: false,
  },
)

defineEmits<{
  retry: []
}>()

const metrics = computed(() => {
  if (props.state?.status !== 'AVAILABLE') return []
  const analysis = props.state.analysis
  return [
    {
      label: '총 시선 체류 시간',
      value: formatGazeDuration(analysis.totalVisitedDurationMs),
    },
    {
      label: '평균 시선 체류 시간',
      value: formatGazeAverage(analysis.avgVisitedDurationMs),
    },
    {
      label: '총 시선 체류 횟수',
      value: formatGazeCount(analysis.totalVisitedCount),
    },
    {
      label: '되돌아보기 횟수',
      value: formatGazeCount(analysis.reverseReadCount),
    },
  ]
})
</script>

<template>
  <section class="gaze-analysis" :class="{ 'gaze-analysis--compact': compact }" :aria-label="title">
    <header class="gaze-analysis__heading">
      <div>
        <span>시선트래킹</span>
        <h2>{{ title }}</h2>
        <p>학습 중 수집된 시선 데이터의 집계 결과입니다.</p>
      </div>
      <strong v-if="status === 'success' && state?.status === 'AVAILABLE'" class="analysis-status">
        분석 완료
      </strong>
    </header>

    <p v-if="status === 'idle' || status === 'loading'" class="analysis-state" aria-live="polite">
      시선 분석 결과를 불러오는 중입니다.
    </p>

    <div v-else-if="status === 'error'" class="analysis-state analysis-state--error" role="alert">
      <p>{{ error ?? '시선 분석 결과를 불러오지 못했습니다.' }}</p>
      <Button variant="outline" type="button" @click="$emit('retry')"> 다시 불러오기 </Button>
    </div>

    <p v-else-if="state?.status === 'NO_DATA'" class="analysis-state">
      시선 분석 데이터가 없습니다.
    </p>

    <p v-else-if="state?.status === 'FAILED'" class="analysis-state analysis-state--warning">
      시선 분석을 완료하지 못했습니다.
    </p>

    <dl v-else-if="state?.status === 'AVAILABLE'" class="gaze-metrics">
      <div v-for="metric in metrics" :key="metric.label">
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}</dd>
      </div>
    </dl>

    <p v-else class="analysis-state">표시할 시선 분석 결과가 없습니다.</p>

    <p class="gaze-disclaimer">
      시선 지표는 학습 과정 참고용이며 의학적·임상적 진단 결과가 아닙니다.
    </p>
  </section>
</template>

<style scoped>
.gaze-analysis {
  display: grid;
  gap: 18px;
  padding: 22px 0 4px;
  border-top: 1px solid var(--slate-200);
}

.gaze-analysis__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.gaze-analysis__heading span {
  color: var(--primary-600);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.gaze-analysis h2 {
  margin: 3px 0 0;
  color: var(--slate-900);
  font-size: 17px;
}

.gaze-analysis__heading p {
  margin: 4px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}

.analysis-status {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--success-600) 12%, transparent);
  color: var(--success-600);
  font-size: 10px;
}

.gaze-metrics {
  display: grid;
  margin: 0;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  overflow: hidden;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.gaze-metrics > div {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 16px;
  background: var(--white);
}

.gaze-metrics > div + div {
  border-left: 1px solid var(--slate-200);
}

.gaze-metrics dt {
  color: var(--slate-500);
  font-size: 11px;
}

.gaze-metrics dd {
  margin: 0;
  color: var(--slate-900);
  font-size: 19px;
  font-weight: 800;
}

.analysis-state {
  display: grid;
  min-height: 92px;
  margin: 0;
  padding: 18px;
  border: 1px dashed var(--slate-300);
  border-radius: var(--radius-md);
  color: var(--slate-600);
  font-size: 13px;
  place-items: center;
}

.analysis-state p {
  margin: 0;
}

.analysis-state--error {
  justify-items: start;
  gap: 12px;
  border-style: solid;
  border-color: color-mix(in oklch, var(--danger-600) 28%, var(--border));
  color: var(--danger-600);
}

.analysis-state--warning {
  border-style: solid;
  border-color: color-mix(in oklch, var(--warning-500) 32%, var(--border));
}

.gaze-disclaimer {
  margin: 0;
  color: var(--slate-500);
  font-size: 11px;
  line-height: 1.6;
}

.gaze-analysis--compact {
  gap: 12px;
  padding-top: 18px;
}

.gaze-analysis--compact .gaze-metrics {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gaze-analysis--compact .gaze-metrics > div:nth-child(3) {
  border-left: 0;
}

.gaze-analysis--compact .gaze-metrics > div:nth-child(n + 3) {
  border-top: 1px solid var(--slate-200);
}

@container (max-width: 680px) {
  .gaze-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .gaze-metrics > div:nth-child(3) {
    border-left: 0;
  }

  .gaze-metrics > div:nth-child(n + 3) {
    border-top: 1px solid var(--slate-200);
  }
}

@container (max-width: 420px) {
  .gaze-analysis__heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .gaze-metrics,
  .gaze-analysis--compact .gaze-metrics {
    grid-template-columns: 1fr;
  }

  .gaze-metrics > div + div,
  .gaze-analysis--compact .gaze-metrics > div + div {
    border-top: 1px solid var(--slate-200);
    border-left: 0;
  }
}
</style>
