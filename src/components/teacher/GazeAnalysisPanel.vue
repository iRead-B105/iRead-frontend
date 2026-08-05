<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
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
    showStatus?: boolean
    showAggregateChart?: boolean
    showDisclaimer?: boolean
  }>(),
  {
    title: '시선 분석',
    error: null,
    compact: false,
    showStatus: true,
    showAggregateChart: true,
    showDisclaimer: true,
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


interface AggregateBar {
  readonly label: string
  readonly value: number | null
  readonly displayValue: string
  readonly width: string
}

function aggregateBars(values: readonly Omit<AggregateBar, 'width'>[]): readonly AggregateBar[] {
  const maximum = Math.max(
    0,
    ...values.map((item) => item.value).filter((value): value is number => value !== null),
  )
  return values.map((item) => ({
    ...item,
    width:
      item.value === null || maximum === 0
        ? '0%'
        : `${Math.max(4, Math.round((item.value / maximum) * 100))}%`,
  }))
}

const aggregateGroups = computed(() => {
  if (props.state?.status !== 'AVAILABLE') return []
  const analysis = props.state.analysis
  return [
    {
      title: '체류 시간',
      items: aggregateBars([
        { label: '총 체류', value: analysis.totalVisitedDurationMs, displayValue: formatGazeDuration(analysis.totalVisitedDurationMs) },
        { label: '평균 체류', value: analysis.avgVisitedDurationMs, displayValue: formatGazeAverage(analysis.avgVisitedDurationMs) },
      ]),
    },
    {
      title: '체류 행동',
      items: aggregateBars([
        { label: '총 체류', value: analysis.totalVisitedCount, displayValue: formatGazeCount(analysis.totalVisitedCount) },
        { label: '되돌아보기', value: analysis.reverseReadCount, displayValue: formatGazeCount(analysis.reverseReadCount) },
      ]),
    },
  ]
})
const replay = computed(() =>
  props.state?.status === 'AVAILABLE' ? props.state.analysis.replay ?? null : null,
)

const replayWords = computed(() => replay.value?.words ?? [])
const replaySamples = computed(() => replay.value?.samples ?? [])
const maxWordDwellMs = computed(() =>
  Math.max(0, ...replayWords.value.map((word) => word.dwellMs)),
)

function replayWordKey(
  item: {
    questionNo?: number | null
    questionNumber?: number | null
    targetIndex?: number | null
    tokenIndex?: number | null
    text?: string
  },
) {
  return [
    item.questionNo ?? item.questionNumber ?? '-',
    item.targetIndex ?? '-',
    item.tokenIndex ?? '-',
    item.text ?? '',
  ].join(':')
}

function wordTitle(word: {
  questionNo?: number | null
  questionNumber?: number | null
  tokenIndex?: number | null
  text?: string
}) {
  const questionNo = word.questionNo ?? word.questionNumber
  const prefix = questionNo ? `${questionNo}번 ` : ''
  const order = word.tokenIndex !== null && word.tokenIndex !== undefined ? `${word.tokenIndex + 1}. ` : ''
  return `${prefix}${order}${word.text || '-'}`
}

const heatmapWords = computed(() =>
  replayWords.value
    .slice()
    .sort((a, b) =>
      (a.questionNo ?? 0) - (b.questionNo ?? 0)
      || (a.targetIndex ?? 0) - (b.targetIndex ?? 0)
      || (a.tokenIndex ?? 0) - (b.tokenIndex ?? 0),
    )
    .map((word) => {
      const intensity = maxWordDwellMs.value > 0 ? word.dwellMs / maxWordDwellMs.value : 0
      return {
        key: replayWordKey(word),
        title: wordTitle(word),
        dwell: formatGazeDuration(word.dwellMs),
        visits: formatGazeCount(word.visitCount),
        regressions: word.regressionCount,
        skipped: word.skipped,
        style: {
          '--gaze-heat': String(Math.min(1, Math.max(0.08, intensity))),
        } as CSSProperties,
      }
    }),
)

const movementSteps = computed(() => {
  const wordsByKey = new Map(replayWords.value.map((word) => [replayWordKey(word), word]))
  const steps: Array<{
    key: string
    order: number
    title: string
    detail: string
  }> = []
  let previousKey = ''
  replaySamples.value
    .filter((sample) => sample.text.trim() !== '')
    .slice()
    .sort((a, b) => (a.capturedAtMs ?? 0) - (b.capturedAtMs ?? 0))
    .forEach((sample) => {
      const key = replayWordKey(sample)
      if (key === previousKey || steps.length >= 24) return
      previousKey = key
      const word = wordsByKey.get(key)
      steps.push({
        key: `${key}:${sample.capturedAtMs ?? steps.length}`,
        order: steps.length + 1,
        title: wordTitle(sample),
        detail: word
          ? `${formatGazeDuration(word.dwellMs)} · ${formatGazeCount(word.visitCount)}`
          : '샘플 기준 이동',
      })
    })
  return steps
})
</script>

<template>
  <section class="gaze-analysis" :class="{ 'gaze-analysis--compact': compact }" :aria-label="title">
    <header class="gaze-analysis__heading">
      <div>
        <span>시선트래킹</span>
        <h2>{{ title }}</h2>
      </div>
      <strong
        v-if="showStatus && status === 'success' && state?.status === 'AVAILABLE'"
        class="analysis-status"
      >
        분석 완료
      </strong>
    </header>

    <p v-if="status === 'idle' || status === 'loading'" class="analysis-state" aria-live="polite">
      시선 분석 결과를 불러오는 중입니다.
    </p>

    <div v-else-if="status === 'error'" class="analysis-state analysis-state--error" role="alert">
      <p>{{ error ?? '시선 분석 결과를 불러오지 못했습니다.' }}</p>
      <Button variant="outline" type="button" @click="$emit('retry')">다시 불러오기</Button>
    </div>

    <p v-else-if="state?.status === 'NO_DATA'" class="analysis-state">
      시선 분석 데이터가 없습니다.
    </p>

    <p v-else-if="state?.status === 'FAILED'" class="analysis-state analysis-state--warning">
      시선 분석을 완료하지 못했습니다.
    </p>

    <div v-else-if="state?.status === 'AVAILABLE'" class="gaze-results">
      <dl class="gaze-metrics">
        <div v-for="metric in metrics" :key="metric.label">
          <dt>{{ metric.label }}</dt>
          <dd>{{ metric.value }}</dd>
        </div>
      </dl>
      <section v-if="showAggregateChart" class="aggregate-chart" aria-label="실제 시선 집계 지표 비교 그래프">
        <h3>집계 지표 비교</h3>
        <div class="aggregate-chart__groups">
          <article v-for="group in aggregateGroups" :key="group.title">
            <strong>{{ group.title }}</strong>
            <div v-for="item in group.items" :key="item.label" class="aggregate-bar">
              <div>
                <span>{{ item.label }}</span>
                <b>{{ item.displayValue }}</b>
              </div>
              <div class="aggregate-bar__track" aria-hidden="true">
                <span :style="{ width: item.width }"></span>
              </div>
            </div>
          </article>
        </div>
      </section>
      <section v-if="heatmapWords.length > 0" class="gaze-replay" aria-label="단어별 시선 히트맵">
        <header>
          <h3>단어별 시선 머무름</h3>
          <p>진하게 표시된 단어일수록 오래 머문 단어입니다.</p>
        </header>
        <ol class="gaze-word-heatmap">
          <li
            v-for="word in heatmapWords"
            :key="word.key"
            :class="{ 'is-skipped': word.skipped }"
            :style="word.style"
          >
            <strong>{{ word.title }}</strong>
            <span>{{ word.dwell }} · {{ word.visits }}</span>
            <em v-if="word.regressions > 0">되돌아보기 {{ word.regressions }}회</em>
          </li>
        </ol>
      </section>

      <section v-if="movementSteps.length > 0" class="gaze-movement" aria-label="시선 이동 순서">
        <header>
          <h3>이동 순서</h3>
          <p>실제 샘플 순서에서 같은 단어 연속 구간을 한 번으로 줄였습니다.</p>
        </header>
        <ol>
          <li v-for="step in movementSteps" :key="step.key">
            <b>{{ step.order }}</b>
            <span>{{ step.title }}</span>
            <small>{{ step.detail }}</small>
          </li>
        </ol>
      </section>
    </div>

    <p v-else class="analysis-state">표시할 시선 분석 결과가 없습니다.</p>
    <p v-if="showDisclaimer" class="gaze-disclaimer">
      시선 지표는 학습 과정 참고용이며 의학적 진단 결과가 아닙니다.
    </p>
  </section>
</template>

<style scoped>
.gaze-analysis {
  display: grid;
  gap: 18px;
  padding: 22px 0 4px;
  border-top: 1px solid var(--slate-200);
  container-type: inline-size;
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

.gaze-results {
  display: grid;
  gap: 14px;
}

.aggregate-chart {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--slate-50);
}

.aggregate-chart h3 {
  margin: 0;
  color: var(--slate-800);
  font-size: 13px;
}

.aggregate-chart__groups {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.aggregate-chart article {
  display: grid;
  gap: 10px;
}

.aggregate-chart article > strong {
  color: var(--slate-600);
  font-size: 11px;
}

.aggregate-bar {
  display: grid;
  gap: 6px;
}

.aggregate-bar > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--slate-600);
  font-size: 11px;
}

.aggregate-bar b {
  color: var(--slate-800);
  font-size: 11px;
}

.aggregate-bar__track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--slate-200);
}

.aggregate-bar__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-300));
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

.gaze-replay,
.gaze-movement {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--white);
}

.gaze-replay header,
.gaze-movement header {
  display: grid;
  gap: 3px;
}

.gaze-replay h3,
.gaze-movement h3 {
  margin: 0;
  color: var(--slate-800);
  font-size: 13px;
}

.gaze-replay p,
.gaze-movement p {
  margin: 0;
  color: var(--slate-500);
  font-size: 11px;
}

.gaze-word-heatmap {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
}

.gaze-word-heatmap li {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 11px;
  border: 1px solid color-mix(in oklch, var(--primary-500) 26%, var(--slate-200));
  border-radius: var(--radius-sm);
  background: var(--white);
  box-shadow: inset 0 0 0 999px rgb(37 99 235 / calc(var(--gaze-heat) * 0.2));
}

.gaze-word-heatmap li.is-skipped {
  border-style: dashed;
  background: var(--slate-50);
  box-shadow: none;
  opacity: 0.68;
}

.gaze-word-heatmap strong {
  overflow: hidden;
  color: var(--slate-900);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gaze-word-heatmap span,
.gaze-word-heatmap em {
  color: var(--slate-600);
  font-size: 10px;
  font-style: normal;
}

.gaze-movement ol {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.gaze-movement li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 2px 8px;
  min-width: 150px;
  max-width: 220px;
  padding: 9px 10px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-sm);
  background: var(--slate-50);
}

.gaze-movement b {
  display: grid;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--primary-600);
  color: var(--white);
  font-size: 11px;
  place-items: center;
  grid-row: span 2;
}

.gaze-movement span {
  overflow: hidden;
  color: var(--slate-800);
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gaze-movement small {
  color: var(--slate-500);
  font-size: 10px;
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

  .aggregate-chart__groups {
    grid-template-columns: 1fr;
  }
}
</style>
