<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type CSSProperties } from 'vue'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import { formatGazeCount, formatGazeDuration } from '@/features/teacher/gaze'
import type {
  StoryGazeAnalysis,
  StoryGazeAnalysisStatus,
  StoryPage,
  StoryPageGazeMetric,
  StoryRequestStatus,
} from '@/features/teacher/story'

const props = defineProps<{
  storyStatus: StoryGazeAnalysisStatus
  page: StoryPage | null
  analysis: StoryGazeAnalysis | null
  metric: StoryPageGazeMetric | null
  requestStatus: StoryRequestStatus
  error: string | null
  contractError: string | null
}>()

const emit = defineEmits<{
  retry: []
  replayStepChange: [
    step: {
      readonly kind: 'read' | 'regression' | 'skip'
      readonly tokenIndexes: readonly number[]
    } | null,
  ]
}>()

function formatOffset(milliseconds: number): string {
  return `${Number((milliseconds / 1_000).toFixed(2))}초`
}

const MAX_REPLAY_STEPS = 24
const MAX_DISPLAY_GAP_MS = 5_000
const COMPRESSED_GAP_MS = 350

interface ReplayWordView {
  readonly key: string
  readonly label: string
  readonly text: string
  readonly tokenIndex: number | null
  readonly dwellMs: number
  readonly visitCount: number
  readonly skipped: boolean
  readonly regressions: number
  readonly firstSeenMs: number | null
  readonly source: 'sample' | 'metric'
  readonly style: CSSProperties
}

interface ReplayStepView {
  readonly key: string
  readonly order: number
  readonly label: string
  readonly detail: string
  readonly tokenIndex: number | null
  readonly targetTokenIndexes: readonly number[]
  readonly kind: 'read' | 'regression' | 'skip'
  readonly isRegression: boolean
  readonly isSkipped: boolean
}

interface DisplayRegressionView {
  readonly fromTokenIndex: number
  readonly toTokenIndex: number
  readonly offsetMs: number
  readonly isSkipReturn: boolean
}

function pageMatches(value: number | null | undefined, pageNo: number): boolean {
  return value === pageNo || value === pageNo - 1
}

function tokenLabel(tokenIndex: number | null | undefined, text: string): string {
  return tokenIndex === null || tokenIndex === undefined ? text : `${tokenIndex + 1}. ${text}`
}

function tokenPositionLabel(tokenIndex: number | null | undefined): string {
  return tokenIndex === null || tokenIndex === undefined ? '-' : `${tokenIndex + 1}번 위치`
}

function isSkipReturnMovement(fromTokenIndex: number, toTokenIndex: number): boolean {
  return fromTokenIndex > toTokenIndex + 1
}

function compressedOffset(
  milliseconds: number | null | undefined,
  previousRawOffsetMs: number | null,
  previousDisplayOffsetMs: number | null,
): number {
  if (milliseconds === null || milliseconds === undefined) {
    return previousDisplayOffsetMs === null ? 0 : previousDisplayOffsetMs + COMPRESSED_GAP_MS
  }
  if (previousRawOffsetMs === null || previousDisplayOffsetMs === null) return Math.max(0, milliseconds)
  const gap = milliseconds - previousRawOffsetMs
  return gap > MAX_DISPLAY_GAP_MS
    ? previousDisplayOffsetMs + COMPRESSED_GAP_MS
    : previousDisplayOffsetMs + Math.max(0, gap)
}

function pageTextTokens(): string[] {
  const metricText = props.metric?.surfaceText.trim()
  const sourceText = metricText || props.page?.textLines.join(' ').trim() || ''
  return sourceText.split(/\s+/).filter(Boolean)
}

const replayStepIndex = ref(0)
const replayPlaying = ref(false)
let replayTimer: ReturnType<typeof window.setInterval> | null = null

const rawPageReplayWords = computed(() => {
  const pageNo = props.metric?.pageNo
  if (!props.analysis?.replay || pageNo === undefined) return []
  return props.analysis.replay.words
    .filter((word) => pageMatches(word.questionNo, pageNo))
    .slice()
    .sort((first, second) => (first.tokenIndex ?? 0) - (second.tokenIndex ?? 0))
})

const rawPageReplaySamples = computed(() => {
  const pageNo = props.metric?.pageNo
  if (!props.analysis?.replay || pageNo === undefined) return []
  return props.analysis.replay.samples
    .filter((sample) => pageMatches(sample.questionNumber, pageNo))
    .slice()
    .sort((first, second) => (first.capturedAtMs ?? 0) - (second.capturedAtMs ?? 0))
})

const metricReplayWords = computed((): readonly Omit<ReplayWordView, 'style'>[] => {
  const metric = props.metric
  if (!metric) return []
  const tokens = pageTextTokens()
  if (tokens.length === 0) return []
  const regressionCounts = new Map<number, number>()
  metric.regressions.forEach((regression) => {
    if (isSkipReturnMovement(regression.fromTokenIndex, regression.toTokenIndex)) return
    regressionCounts.set(regression.toTokenIndex, (regressionCounts.get(regression.toTokenIndex) ?? 0) + 1)
  })
  const baseDwell = Math.max(1, Math.round(metric.dwellDurationMs / tokens.length))
  const baseVisits = Math.max(1, Math.round(metric.fixationCount / tokens.length))
  return tokens.map((text, tokenIndex) => {
    const regressions = regressionCounts.get(tokenIndex) ?? 0
    return {
      key: `${metric.pageNo}:${tokenIndex}:${text}:metric`,
      label: tokenLabel(tokenIndex, text),
      text,
      tokenIndex,
      dwellMs: baseDwell + regressions * Math.round(baseDwell * 0.35),
      visitCount: baseVisits + regressions,
      skipped: false,
      regressions,
      firstSeenMs: null,
      source: 'metric',
    }
  })
})

const maxReplayDwellMs = computed(() =>
  Math.max(
    0,
    ...rawPageReplayWords.value.map((word) => word.dwellMs),
    ...metricReplayWords.value.map((word) => word.dwellMs),
  ),
)

const pageHeatmapWords = computed(() =>
  (rawPageReplayWords.value.length > 0
    ? rawPageReplayWords.value.map((word) => ({
        key: `${word.questionNo}:${word.tokenIndex}:${word.text}:sample`,
        label: tokenLabel(word.tokenIndex, word.text),
        text: word.text,
        tokenIndex: word.tokenIndex,
        dwellMs: word.dwellMs,
        visitCount: word.visitCount,
        skipped: word.skipped,
        regressions: visibleRegressionCountsByTokenIndex.value.get(word.tokenIndex ?? -1) ?? word.regressionCount,
        firstSeenMs: word.firstSeenMs,
        source: 'sample' as const,
      }))
    : metricReplayWords.value
  ).map((word): ReplayWordView => {
    const intensity = maxReplayDwellMs.value > 0 ? word.dwellMs / maxReplayDwellMs.value : 0
    return {
      ...word,
      style: {
        '--story-gaze-heat': String(Math.min(1, Math.max(0.08, intensity))),
      } as CSSProperties,
    }
  }),
)

const pageMovementSteps = computed(() => {
  const steps: ReplayStepView[] = []
  const addStep = (step: Omit<ReplayStepView, 'order'>) => {
    if (steps.length >= MAX_REPLAY_STEPS) return
    steps.push({
      ...step,
      order: steps.length + 1,
    })
  }
  const sampleBaseMs = rawPageReplaySamples.value.find((sample) => sample.capturedAtMs !== null)?.capturedAtMs ?? 0
  let previousKey = ''
  let previousTokenIndex: number | null = null
  let previousRawOffsetMs: number | null = null
  let previousDisplayOffsetMs: number | null = null
  let currentMovementKind: 'read' | 'regression' | 'skip' = 'read'
  let currentMovementDetail = ''
  const skippedReturnTokenIndexes = new Set<number>()

  rawPageReplaySamples.value.forEach((sample) => {
    if (!sample.text.trim()) return
    const key = `${sample.questionNumber}:${sample.tokenIndex}:${sample.text}`
    const elapsedMs = sample.capturedAtMs === null ? null : Math.max(0, sample.capturedAtMs - sampleBaseMs)
    const displayOffsetMs = compressedOffset(elapsedMs, previousRawOffsetMs, previousDisplayOffsetMs)
    previousRawOffsetMs = elapsedMs
    previousDisplayOffsetMs = displayOffsetMs
    if (key === previousKey || steps.length >= MAX_REPLAY_STEPS) return
    previousKey = key
    currentMovementKind = 'read'
    currentMovementDetail = sample.capturedAtMs === null ? '샘플 이동' : formatOffset(displayOffsetMs)

    if (previousTokenIndex !== null && sample.tokenIndex !== null) {
      if (sample.tokenIndex < previousTokenIndex) {
        if (skippedReturnTokenIndexes.has(sample.tokenIndex)) {
          skippedReturnTokenIndexes.delete(sample.tokenIndex)
        } else {
          currentMovementKind = 'regression'
          currentMovementDetail = `되돌아보기 · ${formatOffset(displayOffsetMs)}`
        }
      } else if (sample.tokenIndex > previousTokenIndex + 1) {
        currentMovementKind = 'skip'
        currentMovementDetail = `건너뜀 · ${formatOffset(displayOffsetMs)}`
        for (let skippedIndex = previousTokenIndex + 1; skippedIndex < sample.tokenIndex; skippedIndex += 1) {
          skippedReturnTokenIndexes.add(skippedIndex)
        }
      }
    }

    addStep({
      key: `${key}:${sample.capturedAtMs ?? steps.length}`,
      label: tokenLabel(sample.tokenIndex, sample.text),
      detail: currentMovementDetail,
      tokenIndex: sample.tokenIndex,
      targetTokenIndexes: sample.tokenIndex === null ? [] : [sample.tokenIndex],
      kind: currentMovementKind,
      isRegression: currentMovementKind === 'regression',
      isSkipped: currentMovementKind === 'skip',
    })
    if (sample.tokenIndex !== null && currentMovementKind === 'read') {
      skippedReturnTokenIndexes.delete(sample.tokenIndex)
    }
    previousTokenIndex = sample.tokenIndex
  })
  if (steps.length > 0) return steps

  const usedRegressionIndexes = new Set<number>()
  const sortedWords = pageHeatmapWords.value
    .slice()
    .sort(
      (first, second) =>
        (first.firstSeenMs ?? Number.MAX_SAFE_INTEGER) -
          (second.firstSeenMs ?? Number.MAX_SAFE_INTEGER) ||
        (first.tokenIndex ?? 0) - (second.tokenIndex ?? 0),
    )
  const wordByTokenIndex = new Map(
    pageHeatmapWords.value
      .filter((word) => word.tokenIndex !== null)
      .map((word) => [word.tokenIndex as number, word]),
  )

  sortedWords.forEach((word) => {
    let wordHandledByMovement = false
    displayRegressions.value.forEach((regression, regressionIndex) => {
      if (
        usedRegressionIndexes.has(regressionIndex)
        || word.tokenIndex === null
        || regression.toTokenIndex !== word.tokenIndex
        || steps.length >= MAX_REPLAY_STEPS
      ) return
      usedRegressionIndexes.add(regressionIndex)
      if (regression.isSkipReturn) {
        const fromWord = wordByTokenIndex.get(regression.fromTokenIndex)
        if (fromWord && steps.length < MAX_REPLAY_STEPS) {
          addStep({
            key: `${fromWord.key}:metric-skip-before-return:${regressionIndex}`,
            label: fromWord.label,
            detail: `건너뜀 · ${formatOffset(regression.offsetMs)}`,
            tokenIndex: regression.fromTokenIndex,
            targetTokenIndexes: [regression.fromTokenIndex],
            kind: 'skip',
            isRegression: false,
            isSkipped: true,
          })
        }
        return
      }

      const fromWord = wordByTokenIndex.get(regression.fromTokenIndex)
      if (fromWord && steps.length < MAX_REPLAY_STEPS) {
        addStep({
          key: `${fromWord.key}:metric-skip-before-regression:${regressionIndex}`,
          label: fromWord.label,
          detail: `건너뜀 · ${formatOffset(regression.offsetMs)}`,
          tokenIndex: regression.fromTokenIndex,
          targetTokenIndexes: [regression.fromTokenIndex],
          kind: 'skip',
          isRegression: false,
          isSkipped: true,
        })
      }
      addStep({
        key: `${word.key}:metric-regression:${regressionIndex}`,
        label: word.label,
        detail: `되돌아보기 · ${formatOffset(regression.offsetMs)}`,
        tokenIndex: regression.toTokenIndex,
        targetTokenIndexes: [regression.toTokenIndex],
        kind: 'regression',
        isRegression: true,
        isSkipped: false,
      })
      wordHandledByMovement = true
    })

    if (wordHandledByMovement) return
    if (steps.length >= MAX_REPLAY_STEPS) return
    addStep({
      key: `${word.key}:word-step`,
      label: word.label,
      detail: word.regressions > 0
        ? `되돌아보기 ${word.regressions}회`
        : word.source === 'sample'
          ? formatGazeDuration(word.dwellMs)
          : '페이지 지표 기반',
      tokenIndex: word.tokenIndex,
      targetTokenIndexes: word.tokenIndex === null ? [] : [word.tokenIndex],
      kind: 'read',
      isRegression: word.regressions > 0,
      isSkipped: false,
    })
  })

  displayRegressions.value.forEach((regression, regressionIndex) => {
    if (usedRegressionIndexes.has(regressionIndex) || steps.length >= MAX_REPLAY_STEPS) return
    if (regression.isSkipReturn) {
      addStep({
        key: `metric-skip-return:${regression.fromTokenIndex}:${regression.toTokenIndex}:${regressionIndex}`,
        label: tokenPositionLabel(regression.fromTokenIndex),
        detail: `건너뜀 · ${formatOffset(regression.offsetMs)}`,
        tokenIndex: regression.fromTokenIndex,
        targetTokenIndexes: [regression.fromTokenIndex],
        kind: 'skip',
        isRegression: false,
        isSkipped: true,
      })
      return
    }
    addStep({
      key: `metric-regression:${regression.fromTokenIndex}:${regression.toTokenIndex}:${regressionIndex}`,
      label: tokenPositionLabel(regression.toTokenIndex),
      detail: `되돌아보기 · ${formatOffset(regression.offsetMs)}`,
      tokenIndex: regression.toTokenIndex,
      targetTokenIndexes: [regression.toTokenIndex],
      kind: 'regression',
      isRegression: true,
      isSkipped: false,
    })
  })

  return steps.map((step, index) => ({ ...step, order: index + 1 }))
})

const displayRegressions = computed<readonly DisplayRegressionView[]>(() => {
  const metric = props.metric
  if (!metric) return []
  let previousRawOffsetMs: number | null = null
  let previousDisplayOffsetMs: number | null = null

  return metric.regressions.map((regression) => {
    const rawOffsetMs = Math.max(0, regression.offsetMs - Math.min(metric.firstGazeOffsetMs, regression.offsetMs))
    const gap = previousRawOffsetMs === null ? 0 : rawOffsetMs - previousRawOffsetMs
    const offsetMs =
      previousDisplayOffsetMs === null
        ? rawOffsetMs
        : gap > MAX_DISPLAY_GAP_MS
          ? previousDisplayOffsetMs + COMPRESSED_GAP_MS
          : previousDisplayOffsetMs + Math.max(0, gap)

    previousRawOffsetMs = rawOffsetMs
    previousDisplayOffsetMs = offsetMs

    return {
      fromTokenIndex: regression.fromTokenIndex,
      toTokenIndex: regression.toTokenIndex,
      offsetMs,
      isSkipReturn: isSkipReturnMovement(regression.fromTokenIndex, regression.toTokenIndex),
    }
  })
})

const visibleRegressions = computed(() =>
  displayRegressions.value.filter((regression) => !regression.isSkipReturn),
)

const visibleRegressionCountsByTokenIndex = computed(() => {
  const counts = new Map<number, number>()
  visibleRegressions.value.forEach((regression) => {
    counts.set(regression.toTokenIndex, (counts.get(regression.toTokenIndex) ?? 0) + 1)
  })
  return counts
})

const replayDataLabel = computed(() =>
  rawPageReplaySamples.value.length > 0
    ? `${rawPageReplaySamples.value.length}개 시선 샘플`
    : rawPageReplayWords.value.length > 0
      ? `${rawPageReplayWords.value.length}개 단어 샘플`
      : '페이지 지표 기반',
)

const activeReplayStep = computed(() => pageMovementSteps.value[replayStepIndex.value] ?? null)
watch(
  activeReplayStep,
  (step) => {
    emit('replayStepChange', step
      ? {
          kind: step.kind,
          tokenIndexes: step.targetTokenIndexes,
        }
      : null)
  },
  { immediate: true },
)
const visibleReplayStep = computed<ReplayStepView>(() =>
  activeReplayStep.value ?? {
    key: 'empty-replay-step',
    order: 0,
    label: '페이지 리플레이',
    detail: '저장된 샘플이 없어 페이지 지표만 표시합니다.',
    tokenIndex: null,
    targetTokenIndexes: [],
    kind: 'read',
    isRegression: false,
    isSkipped: false,
  },
)
const replayProgressStyle = computed(() => {
  const total = pageMovementSteps.value.length
  const progress = total <= 1 ? 100 : Math.round((replayStepIndex.value / (total - 1)) * 100)
  return { width: `${progress}%` }
})

function stopReplay(): void {
  replayPlaying.value = false
  if (replayTimer !== null) {
    window.clearInterval(replayTimer)
    replayTimer = null
  }
}

function advanceReplayStep(): void {
  const total = pageMovementSteps.value.length
  if (total === 0) {
    stopReplay()
    return
  }
  if (replayStepIndex.value + 1 >= total) {
    replayStepIndex.value = 0
    return
  }
  replayStepIndex.value += 1
}

function toggleReplay(): void {
  if (replayPlaying.value) {
    stopReplay()
    return
  }
  if (pageMovementSteps.value.length === 0) return
  replayPlaying.value = true
  replayTimer = window.setInterval(advanceReplayStep, 700)
}

function resetReplay(): void {
  stopReplay()
  replayStepIndex.value = 0
}

function moveReplayFrame(delta: number): void {
  stopReplay()
  const total = pageMovementSteps.value.length
  if (total === 0) return
  replayStepIndex.value = Math.min(total - 1, Math.max(0, replayStepIndex.value + delta))
}

watch(
  () => [props.metric?.pageNo, pageMovementSteps.value.length] as const,
  () => resetReplay(),
)

onBeforeUnmount(stopReplay)
</script>

<template>
  <aside class="story-page-analysis" aria-labelledby="story-page-analysis-title">
    <header class="story-page-analysis__heading">
      <p>선택 페이지</p>
      <h3 id="story-page-analysis-title">읽기 리플레이</h3>
    </header>

    <AsyncStatePanel
      v-if="storyStatus === 'NOT_COLLECTED'"
      kind="empty"
      title="시선 분석 데이터가 없어요"
      message="이 이야기에서 수집된 시선 기록이 없습니다."
      compact
    />
    <AsyncStatePanel
      v-else-if="storyStatus === 'RUNNING'"
      kind="loading"
      title="시선 분석을 준비하고 있어요"
      message="분석이 완료되면 페이지별 결과를 확인할 수 있습니다."
      compact
    />
    <AsyncStatePanel
      v-else-if="storyStatus === 'FAILED'"
      kind="error"
      title="시선 분석을 완료하지 못했어요"
      message="최신 시선 수집 또는 분석 작업이 실패했습니다."
      compact
    />
    <AsyncStatePanel
      v-else-if="requestStatus === 'loading' && analysis === null"
      kind="loading"
      title="시선 분석을 불러오고 있어요"
      message="이야기 페이지는 먼저 확인할 수 있습니다."
      compact
    />
    <AsyncStatePanel
      v-else-if="requestStatus === 'error'"
      kind="error"
      title="시선 분석을 불러오지 못했어요"
      :message="error ?? '잠시 후 다시 시도해 주세요.'"
      retry-label="다시 불러오기"
      compact
      @retry="$emit('retry')"
    />
    <AsyncStatePanel
      v-else-if="contractError"
      kind="error"
      title="페이지 분석을 연결하지 못했어요"
      :message="contractError"
      retry-label="다시 불러오기"
      compact
      @retry="$emit('retry')"
    />
    <AsyncStatePanel
      v-else-if="requestStatus === 'success' && analysis === null"
      kind="empty"
      title="분석 결과가 아직 준비되지 않았어요"
      message="최신 상태를 확인한 뒤 다시 시도해 주세요."
      compact
    />
    <AsyncStatePanel
      v-else-if="analysis && metric === null"
      kind="empty"
      title="이 페이지의 분석 기록이 없어요"
      message="이야기 전체 분석은 완료됐지만 현재 페이지에 저장된 시선 지표가 없습니다."
      compact
    />

    <template v-else-if="analysis && metric">
      <p v-if="requestStatus === 'loading'" class="story-page-analysis__updating" role="status">
        최신 시선 분석을 다시 불러오고 있습니다.
      </p>

      <section class="story-page-replay" aria-label="페이지 시선 리플레이">
        <div class="story-page-heatmap__heading">
          <h4>읽기 리플레이</h4>
          <span>{{ replayDataLabel }}</span>
        </div>
        <div class="story-page-replay__stage">
          <div class="story-page-replay__playhead" aria-hidden="true">
            <span>{{ visibleReplayStep.order }}</span>
          </div>
          <div>
            <strong>{{ visibleReplayStep.label }}</strong>
            <p>{{ visibleReplayStep.detail }}</p>
          </div>
        </div>
        <div class="story-page-replay__progress" aria-hidden="true">
          <span :style="replayProgressStyle"></span>
        </div>
        <div class="story-page-replay__actions">
          <button type="button" :disabled="pageMovementSteps.length === 0 || replayStepIndex === 0" @click="moveReplayFrame(-1)">
            이전
          </button>
          <button type="button" :disabled="pageMovementSteps.length === 0" @click="toggleReplay">
            {{ replayPlaying ? '일시정지' : '재생' }}
          </button>
          <button
            type="button"
            :disabled="pageMovementSteps.length === 0 || replayStepIndex >= pageMovementSteps.length - 1"
            @click="moveReplayFrame(1)"
          >
            다음
          </button>
          <button type="button" :disabled="pageMovementSteps.length === 0" @click="resetReplay">처음</button>
        </div>
      </section>

      <section class="story-page-analysis-record" aria-label="시선 분석 기록">
        <div class="story-page-heatmap__heading">
          <h4>시선 분석 기록</h4>
          <span>{{ visibleRegressions.length }}회 되돌아보기</span>
        </div>

      <dl class="story-page-analysis__metrics">
        <div>
          <dt>총 시선 체류 시간</dt>
          <dd>{{ formatGazeDuration(metric.dwellDurationMs) }}</dd>
        </div>
        <div>
          <dt>평균 시선 체류 시간</dt>
          <dd>
            {{
              metric.averageFixationTimeMs === null
                ? '-'
                : formatGazeDuration(metric.averageFixationTimeMs)
            }}
          </dd>
        </div>
        <div>
          <dt>시선 체류 횟수</dt>
          <dd>{{ metric.fixationCount }}회</dd>
        </div>
        <div>
          <dt>되돌아보기 횟수</dt>
          <dd>{{ visibleRegressions.length }}회</dd>
        </div>
      </dl>

      <dl class="story-page-analysis__timing">
        <div>
          <dt>첫 시선 진입</dt>
          <dd>{{ formatOffset(metric.firstGazeOffsetMs) }}</dd>
        </div>
        <div>
          <dt>마지막 시선 이탈</dt>
          <dd>{{ formatOffset(metric.lastGazeOffsetMs) }}</dd>
        </div>
      </dl>
      </section>

      <section v-if="pageHeatmapWords.length > 0" class="story-page-heatmap" aria-label="페이지 시선 히트맵">
        <div class="story-page-heatmap__heading">
          <h4>페이지 히트맵</h4>
          <span>{{ pageHeatmapWords.length }}개 단어</span>
        </div>
        <ol>
          <li
            v-for="word in pageHeatmapWords"
            :key="word.key"
            :class="{
              'is-skipped': word.skipped,
              'is-active': activeReplayStep?.tokenIndex === word.tokenIndex,
            }"
            :style="word.style"
          >
            <strong>{{ word.label }}</strong>
            <span>{{ formatGazeDuration(word.dwellMs) }} · {{ formatGazeCount(word.visitCount) }}</span>
            <em v-if="word.skipped">건너뜀</em>
            <em v-if="word.regressions > 0">되돌아보기 {{ word.regressions }}회</em>
          </li>
        </ol>
      </section>

      <section v-if="pageMovementSteps.length > 0" class="story-page-movement" aria-label="페이지 시선 이동 순서">
        <div class="story-page-heatmap__heading">
          <h4>이동 순서</h4>
          <span>{{ pageMovementSteps.length }}개 구간</span>
        </div>
        <ol>
          <li
            v-for="step in pageMovementSteps"
            :key="step.key"
            :class="{
              'is-active': activeReplayStep?.key === step.key,
              'is-regression': step.isRegression,
              'is-skipped': step.isSkipped,
            }"
          >
            <b>{{ step.order }}</b>
            <span>{{ step.label }}</span>
            <small>{{ step.detail }}</small>
          </li>
        </ol>
      </section>

      <section class="story-page-regressions" aria-labelledby="story-page-regressions-title">
        <div class="story-page-regressions__heading">
          <h4 id="story-page-regressions-title">되돌아보기 상세</h4>
          <span>{{ visibleRegressions.length }}회</span>
        </div>
        <p v-if="visibleRegressions.length === 0" class="story-page-regressions__empty">
          이 페이지에서 되돌아본 기록이 없습니다.
        </p>
        <ol v-else>
          <li
            v-for="(regression, index) in visibleRegressions"
            :key="`${regression.offsetMs}-${index}`"
          >
            <strong>{{ index + 1 }}번째</strong>
            <span>
              {{ tokenPositionLabel(regression.fromTokenIndex) }} → {{ tokenPositionLabel(regression.toTokenIndex) }}
            </span>
            <time>{{ formatOffset(regression.offsetMs) }}</time>
          </li>
        </ol>
      </section>

      <section class="story-overall-summary" aria-labelledby="story-overall-summary-title">
        <h4 id="story-overall-summary-title">이야기 전체 요약</h4>
        <dl>
          <div>
            <dt>전체 체류</dt>
            <dd>{{ formatGazeDuration(analysis.totalVisitedDurationMs) }}</dd>
          </div>
          <div>
            <dt>전체 체류 횟수</dt>
            <dd>{{ analysis.totalVisitedCount }}회</dd>
          </div>
          <div>
            <dt>전체 되돌아보기</dt>
            <dd>{{ analysis.reverseReadCount }}회</dd>
          </div>
          <div>
            <dt>보정 상태</dt>
            <dd>{{ analysis.calibrationStatus }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </aside>
</template>

<style scoped>
.story-page-analysis {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--white);
}

.story-page-analysis__heading p,
.story-page-analysis__heading h3 {
  margin: 0;
}

.story-page-analysis__heading p {
  color: var(--primary-700);
  font-size: 11px;
}

.story-page-analysis__heading h3 {
  margin-top: 3px;
  color: var(--slate-900);
  font-size: 16px;
}

.story-page-analysis :deep(.async-state-panel) {
  min-height: 240px;
}

.story-page-analysis__updating {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 11px;
}

.story-page-analysis__metrics,
.story-page-analysis__timing,
.story-overall-summary dl {
  display: grid;
  margin: 0;
  gap: 8px;
}

.story-page-analysis__metrics {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.story-page-analysis__timing,
.story-overall-summary dl {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.story-page-analysis__metrics > div,
.story-page-analysis__timing > div,
.story-overall-summary dl > div {
  min-width: 0;
  padding: 11px 12px;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
}

.story-page-analysis dt,
.story-overall-summary dt {
  color: var(--slate-500);
  font-size: 10px;
}

.story-page-analysis dd,
.story-overall-summary dd {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  color: var(--slate-900);
  font-size: 13px;
  font-weight: 750;
}

.story-page-regressions,
.story-page-replay,
.story-page-analysis-record,
.story-page-heatmap,
.story-page-movement,
.story-overall-summary {
  display: grid;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--slate-200);
}

.story-page-regressions__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.story-page-heatmap__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.story-page-regressions h4,
.story-page-replay h4,
.story-page-analysis-record h4,
.story-page-heatmap h4,
.story-page-movement h4,
.story-overall-summary h4 {
  margin: 0;
  color: var(--slate-800);
  font-size: 13px;
}

.story-page-regressions__heading span,
.story-page-heatmap__heading span,
.story-page-regressions__empty {
  color: var(--slate-500);
  font-size: 11px;
}

.story-page-regressions__empty {
  margin: 0;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
}

.story-page-replay__stage {
  display: grid;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  border: 1px solid color-mix(in oklch, var(--primary-500) 26%, var(--slate-200));
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--primary-50), var(--white));
  grid-template-columns: auto minmax(0, 1fr);
}

.story-page-replay__playhead {
  display: grid;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--primary-600);
  box-shadow: 0 0 0 7px color-mix(in oklch, var(--primary-500) 15%, transparent);
  color: var(--white);
  font-size: 15px;
  font-weight: 850;
  place-items: center;
}

.story-page-replay__stage strong,
.story-page-replay__stage p {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-page-replay__stage strong {
  display: block;
  color: var(--slate-900);
  font-size: 14px;
}

.story-page-replay__stage p {
  margin-top: 3px;
  color: var(--slate-500);
  font-size: 11px;
}

.story-page-replay__progress {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--slate-200);
}

.story-page-replay__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--primary-600), var(--success-600));
  transition: width 180ms ease;
}

.story-page-replay__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.story-page-replay__actions button {
  min-width: 54px;
  padding: 7px 10px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--slate-800);
  cursor: pointer;
  font-size: 11px;
  font-weight: 750;
}

.story-page-replay__actions button:nth-child(2) {
  border-color: var(--primary-600);
  background: var(--primary-600);
  color: var(--white);
}

.story-page-replay__actions button:disabled {
  border-color: var(--slate-200);
  background: var(--slate-100);
  color: var(--slate-400);
  cursor: not-allowed;
}

.story-page-regressions ol {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.story-page-heatmap ol {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
}

.story-page-heatmap li {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid color-mix(in oklch, var(--primary-500) 26%, var(--slate-200));
  border-radius: var(--radius-sm);
  background: var(--white);
  box-shadow: inset 0 0 0 999px rgb(37 99 235 / calc(var(--story-gaze-heat) * 0.2));
}

.story-page-heatmap li.is-skipped {
  border-style: dashed;
  background: var(--slate-50);
  box-shadow: none;
  opacity: 0.62;
}

.story-page-heatmap li.is-active {
  border-color: var(--primary-600);
  box-shadow:
    inset 0 0 0 999px rgb(37 99 235 / calc(var(--story-gaze-heat) * 0.28)),
    0 0 0 2px color-mix(in oklch, var(--primary-500) 22%, transparent);
}

.story-page-heatmap strong {
  overflow: hidden;
  color: var(--slate-900);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-page-heatmap span,
.story-page-heatmap em {
  color: var(--slate-600);
  font-size: 10px;
  font-style: normal;
}

.story-page-movement ol {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.story-page-movement li {
  display: grid;
  align-items: center;
  min-width: 0;
  gap: 2px 7px;
  padding: 8px 9px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-sm);
  background: var(--slate-50);
  grid-template-columns: auto minmax(0, 1fr);
}

.story-page-movement li.is-active {
  border-color: var(--primary-600);
  background: var(--primary-50);
}

.story-page-movement li.is-regression {
  border-color: color-mix(in oklch, var(--warning-500) 42%, var(--slate-200));
}

.story-page-movement li.is-skipped {
  border-color: color-mix(in oklch, var(--danger-600) 34%, var(--slate-200));
  background: color-mix(in oklch, var(--danger-600) 8%, var(--white));
}

.story-page-movement b {
  display: grid;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--primary-600);
  color: var(--white);
  font-size: 10px;
  place-items: center;
  grid-row: span 2;
}

.story-page-movement span {
  overflow: hidden;
  color: var(--slate-800);
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-page-movement small {
  overflow: hidden;
  color: var(--slate-500);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-page-regressions li {
  display: grid;
  align-items: center;
  gap: 5px 8px;
  padding: 10px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-sm);
  grid-template-columns: auto 1fr auto;
}

.story-page-regressions strong,
.story-page-regressions span,
.story-page-regressions time {
  font-size: 10px;
}

.story-page-regressions strong {
  color: var(--slate-800);
}

.story-page-regressions span,
.story-page-regressions time {
  color: var(--slate-600);
}

@media (max-width: 540px) {
  .story-page-analysis__metrics,
  .story-page-analysis__timing,
  .story-overall-summary dl {
    grid-template-columns: 1fr;
  }

  .story-page-regressions li {
    grid-template-columns: 1fr;
  }
}
</style>
