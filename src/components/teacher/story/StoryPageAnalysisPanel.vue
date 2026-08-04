<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import { formatGazeDuration } from '@/features/teacher/gaze'
import type {
  StoryGazeAnalysis,
  StoryGazeAnalysisStatus,
  StoryGazeWordMetric,
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
  heatmapVisible: boolean
}>()

const emit = defineEmits<{
  retry: []
  heatmapVisibilityChange: [visible: boolean]
  replayStepChange: [
    step: {
      readonly kind: 'read' | 'regression' | 'skip'
      readonly tokenIndexes: readonly number[]
      readonly fromTokenIndex: number | null
      readonly toTokenIndex: number
      readonly dwellMs: number
    } | null,
  ]
}>()

interface ReplayStepView {
  readonly key: string
  readonly order: number
  readonly label: string
  readonly detail: string
  readonly kind: 'read' | 'regression' | 'skip'
  readonly tokenIndexes: readonly number[]
  readonly fromTokenIndex: number | null
  readonly toTokenIndex: number
  readonly dwellMs: number
  readonly dwellQualified: boolean
}

function formatOffset(milliseconds: number): string {
  return `${Number((milliseconds / 1_000).toFixed(2))}초`
}

function tokenLabel(metric: StoryGazeWordMetric | undefined, tokenIndex: number): string {
  return `${tokenIndex + 1}. ${metric?.text || `${tokenIndex + 1}번 단어`}`
}

const pageWordMetrics = computed(() => {
  const page = props.page
  if (!page || !props.analysis) return []
  return props.analysis.wordMetrics
    .filter((word) => word.pageNo === page.pageNo && word.storyLineId === page.storyLineId)
    .slice()
    .sort((left, right) => left.tokenIndex - right.tokenIndex)
})

const wordByTokenIndex = computed(() =>
  new Map(pageWordMetrics.value.map((word) => [word.tokenIndex, word])),
)

const pageMovementSteps = computed<readonly ReplayStepView[]>(() => {
  const pageNo = props.page?.pageNo
  if (pageNo === undefined || !props.analysis?.replay) return []
  return props.analysis.replay.events
    .filter((event) => event.pageNo === pageNo)
    .slice()
    .sort((left, right) => left.eventIndex - right.eventIndex)
    .map((event, index) => {
      const kind = event.movementType === 'SKIP'
        ? 'skip'
        : event.movementType === 'REGRESSION'
          ? 'regression'
          : 'read'
      const movementLabel = kind === 'skip' ? '건너뜀' : kind === 'regression' ? '되돌아보기' : '읽음'
      return {
        key: `${event.pageNo}:${event.eventIndex}:${event.toTokenIndex}`,
        order: index + 1,
        label: tokenLabel(wordByTokenIndex.value.get(event.toTokenIndex), event.toTokenIndex),
        detail: `${movementLabel} · ${formatOffset(event.eventAtMs)}`,
        kind,
        tokenIndexes: kind === 'skip'
          ? [...new Set([...event.skippedTokenIndexes, event.toTokenIndex])]
          : [event.toTokenIndex],
        fromTokenIndex: event.fromTokenIndex,
        toTokenIndex: event.toTokenIndex,
        dwellMs: event.dwellDurationMs,
        dwellQualified: event.dwellQualified,
      }
    })
})

const dwellWords = computed(() => pageWordMetrics.value.filter((word) => word.dwellDurationMs > 0))
const skippedWords = computed(() => pageWordMetrics.value.filter((word) => word.skipped))
const regressionWords = computed(() => pageWordMetrics.value.filter((word) => word.regressionCount > 0))
const totalSkippedWordCount = computed(() =>
  props.analysis?.wordMetrics.filter((word) => word.skipped).length ?? 0,
)
const replayDataLabel = computed(() =>
  pageMovementSteps.value.length > 0
    ? `${pageMovementSteps.value.length}개 판정 이벤트`
    : '재생 기록 없음',
)

const replayStepIndex = ref(0)
const replayPlaying = ref(false)
let replayTimer: ReturnType<typeof window.setInterval> | null = null

const activeReplayStep = computed(() => pageMovementSteps.value[replayStepIndex.value] ?? null)
const visibleReplayStep = computed(() => activeReplayStep.value ?? {
  order: 0,
  label: '페이지 리플레이',
  detail: 'Backend 판정 이벤트가 없어 재생할 이동 기록이 없습니다.',
})
const replayProgressStyle = computed(() => {
  const total = pageMovementSteps.value.length
  const progress = total === 0 ? 0 : total === 1 ? 100 : Math.round((replayStepIndex.value / (total - 1)) * 100)
  return { width: `${progress}%` }
})

watch(
  activeReplayStep,
  (step) => emit('replayStepChange', step
    ? {
        kind: step.kind,
        tokenIndexes: step.tokenIndexes,
        fromTokenIndex: step.fromTokenIndex,
        toTokenIndex: step.toTokenIndex,
        dwellMs: step.dwellQualified ? step.dwellMs : 0,
      }
    : null),
  { immediate: true },
)

function stopReplay(): void {
  replayPlaying.value = false
  if (replayTimer !== null) {
    window.clearInterval(replayTimer)
    replayTimer = null
  }
}

function advanceReplayStep(): void {
  if (replayStepIndex.value + 1 >= pageMovementSteps.value.length) {
    stopReplay()
    emit('heatmapVisibilityChange', pageWordMetrics.value.length > 0)
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
  if (props.heatmapVisible) {
    replayStepIndex.value = 0
    emit('heatmapVisibilityChange', false)
  }
  replayPlaying.value = true
  replayTimer = window.setInterval(advanceReplayStep, 700)
}

function moveReplayFrame(delta: number): void {
  stopReplay()
  if (pageMovementSteps.value.length === 0) return
  replayStepIndex.value = Math.min(
    pageMovementSteps.value.length - 1,
    Math.max(0, replayStepIndex.value + delta),
  )
}

function moveReplayToEnd(): void {
  stopReplay()
  if (pageMovementSteps.value.length > 0) replayStepIndex.value = pageMovementSteps.value.length - 1
}

watch(
  () => [props.page?.storyLineId, pageMovementSteps.value.length, pageWordMetrics.value.length] as const,
  () => {
    stopReplay()
    replayStepIndex.value = 0
    emit('heatmapVisibilityChange', pageMovementSteps.value.length === 0 && pageWordMetrics.value.length > 0)
  },
  { immediate: true },
)

onBeforeUnmount(stopReplay)
</script>

<template>
  <aside class="story-page-analysis" aria-label="페이지 시선 분석">
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
      message="이야기 페이지를 먼저 확인할 수 있습니다."
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
    <template v-else-if="analysis">
      <div v-if="metric === null" class="story-page-analysis__notice" role="status">
        <strong>이 페이지의 집계 기록이 없어요</strong>
        <p>다른 페이지의 기존 분석 결과는 그대로 유지합니다.</p>
      </div>
      <div v-if="pageWordMetrics.length === 0" class="story-page-analysis__notice" role="status">
        <strong>단어별 시선 기록이 없습니다</strong>
        <p>페이지 집계값을 단어별 값으로 추정하지 않습니다.</p>
      </div>
      <p v-if="requestStatus === 'loading'" class="story-page-analysis__updating" role="status">
        최신 시선 분석을 다시 불러오고 있습니다.
      </p>

      <section class="story-page-replay" aria-label="페이지 시선 리플레이">
        <header class="story-page-section-heading">
          <div>
            <h4>읽기 리플레이</h4>
            <p>{{ analysis.analysisMeta.calculationVersion }}</p>
          </div>
          <span>{{ replayDataLabel }}</span>
        </header>
        <div class="story-page-replay__stage">
          <b aria-hidden="true">{{ visibleReplayStep.order }}</b>
          <div>
            <strong>{{ visibleReplayStep.label }}</strong>
            <p>{{ visibleReplayStep.detail }}</p>
          </div>
        </div>
        <div class="story-page-replay__progress" aria-hidden="true">
          <span :style="replayProgressStyle" />
        </div>
        <div class="story-page-replay__actions">
          <button
            type="button"
            :disabled="heatmapVisible || pageMovementSteps.length === 0 || replayStepIndex === 0"
            @click="moveReplayFrame(-1)"
          >
            이전
          </button>
          <button
            class="is-primary"
            type="button"
            :disabled="pageMovementSteps.length === 0"
            @click="toggleReplay"
          >
            {{ heatmapVisible ? '다시 보기' : replayPlaying ? '일시정지' : '재생' }}
          </button>
          <button
            type="button"
            :disabled="heatmapVisible || pageMovementSteps.length === 0 || replayStepIndex >= pageMovementSteps.length - 1"
            @click="moveReplayFrame(1)"
          >
            다음
          </button>
          <button
            type="button"
            :disabled="heatmapVisible || pageMovementSteps.length === 0 || replayStepIndex >= pageMovementSteps.length - 1"
            @click="moveReplayToEnd"
          >
            마지막
          </button>
        </div>
      </section>

      <section class="story-page-details" aria-labelledby="story-page-dwell-title">
        <header class="story-page-section-heading">
          <h4 id="story-page-dwell-title">체류 상세</h4>
          <span>{{ dwellWords.length }}개 단어</span>
        </header>
        <p v-if="dwellWords.length === 0" class="story-page-details__empty">페이지별 기대 시간을 초과해 체류한 단어가 없습니다.</p>
        <ol v-else>
          <li v-for="word in dwellWords" :key="`${word.storyLineId}:${word.tokenIndex}:dwell`">
            <strong>{{ tokenLabel(word, word.tokenIndex) }}</strong>
            <span>{{ word.visitCount }}회 방문</span>
            <time>{{ formatGazeDuration(word.dwellDurationMs) }}</time>
          </li>
        </ol>
      </section>

      <section class="story-page-details" aria-labelledby="story-page-skipped-title">
        <header class="story-page-section-heading">
          <h4 id="story-page-skipped-title">건너뜀 단어</h4>
          <span>{{ skippedWords.length }}개 단어</span>
        </header>
        <p v-if="skippedWords.length === 0" class="story-page-details__empty">최종적으로 건너뛴 단어가 없습니다.</p>
        <ol v-else>
          <li v-for="word in skippedWords" :key="`${word.storyLineId}:${word.tokenIndex}:skip`">
            <strong>{{ tokenLabel(word, word.tokenIndex) }}</strong>
            <span>최종 건너뜀</span>
          </li>
        </ol>
      </section>

      <section class="story-page-details" aria-labelledby="story-page-regression-title">
        <header class="story-page-section-heading">
          <h4 id="story-page-regression-title">되돌아보기 단어</h4>
          <span>{{ regressionWords.length }}개 단어</span>
        </header>
        <p v-if="regressionWords.length === 0" class="story-page-details__empty">이 페이지에서 되돌아본 기록이 없습니다.</p>
        <ol v-else>
          <li v-for="word in regressionWords" :key="`${word.storyLineId}:${word.tokenIndex}:regression`">
            <strong>{{ tokenLabel(word, word.tokenIndex) }}</strong>
            <span>{{ word.regressionCount }}회 되돌아봄</span>
          </li>
        </ol>
      </section>

      <section class="story-overall-summary" aria-labelledby="story-overall-summary-title">
        <h4 id="story-overall-summary-title">이야기 전체 요약</h4>
        <dl>
          <div><dt>전체 체류 시간</dt><dd>{{ formatGazeDuration(analysis.totalVisitedDurationMs) }}</dd></div>
          <div><dt>전체 체류 횟수</dt><dd>{{ analysis.totalVisitedCount }}회</dd></div>
          <div><dt>되돌아본 횟수</dt><dd>{{ analysis.reverseReadCount }}회</dd></div>
          <div><dt>건너뛴 단어 수</dt><dd>{{ totalSkippedWordCount }}개</dd></div>
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
}

.story-page-analysis__notice,
.story-page-analysis__updating {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-sm);
  background: var(--slate-50);
  color: var(--slate-600);
  font-size: 12px;
}

.story-page-analysis__notice strong,
.story-page-analysis__notice p {
  margin: 0;
}

.story-page-analysis__notice strong {
  color: var(--slate-800);
}

.story-page-analysis__notice p {
  margin-top: 4px;
}

.story-page-replay,
.story-page-details,
.story-overall-summary {
  padding: 16px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: white;
}

.story-page-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.story-page-section-heading h4,
.story-page-section-heading p,
.story-overall-summary h4 {
  margin: 0;
}

.story-page-section-heading h4,
.story-overall-summary h4 {
  color: var(--slate-900);
  font-size: 14px;
}

.story-page-section-heading p,
.story-page-section-heading span {
  color: var(--slate-500);
  font-size: 10px;
}

.story-page-replay__stage {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  margin-top: 14px;
  padding: 14px;
  border-radius: var(--radius-sm);
  background: var(--primary-50);
}

.story-page-replay__stage > b {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 999px;
  background: var(--primary-600);
  color: white;
}

.story-page-replay__stage strong,
.story-page-replay__stage p {
  margin: 0;
}

.story-page-replay__stage p {
  margin-top: 3px;
  color: var(--slate-600);
  font-size: 12px;
}

.story-page-replay__progress {
  height: 5px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--slate-100);
}

.story-page-replay__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary-500);
  transition: width 160ms ease;
}

.story-page-replay__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.story-page-replay__actions button {
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid var(--slate-300);
  border-radius: var(--radius-sm);
  background: white;
  color: var(--slate-700);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.story-page-replay__actions button.is-primary {
  border-color: var(--primary-600);
  background: var(--primary-600);
  color: white;
}

.story-page-replay__actions button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.story-page-details ol {
  display: grid;
  margin: 12px 0 0;
  padding: 0;
  gap: 7px;
  list-style: none;
}

.story-page-details li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
  font-size: 11px;
}

.story-page-details li strong {
  overflow: hidden;
  color: var(--slate-800);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-page-details li span,
.story-page-details li time,
.story-page-details__empty {
  color: var(--slate-500);
}

.story-page-details__empty {
  margin: 12px 0 0;
  font-size: 11px;
}

.story-overall-summary dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 12px 0 0;
  gap: 8px;
}

.story-overall-summary dl > div {
  padding: 10px;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
}

.story-overall-summary dt {
  color: var(--slate-500);
  font-size: 10px;
}

.story-overall-summary dd {
  margin: 4px 0 0;
  color: var(--slate-900);
  font-size: 14px;
  font-weight: 800;
}

@media (max-width: 640px) {
  .story-page-details li {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .story-page-details li time {
    grid-column: 1 / -1;
  }
}
</style>
