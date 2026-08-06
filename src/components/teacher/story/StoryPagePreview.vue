<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  formatStoryActivityAt,
  type StoryGazeWordMetric,
  type StoryImageGenerationStatus,
  type StoryPage,
} from '@/features/teacher/story'
import { resolveTeacherStoryImage } from '@/features/teacher/story/authenticatedStoryImage'

const props = defineProps<{
  page: StoryPage
  studentId: number
  storyId: number
  activeReplayKind?: 'read' | 'regression' | 'skip' | null
  activeReplayTokenIndexes?: readonly number[]
  activeReplayFromTokenIndex?: number | null
  activeReplayToTokenIndex?: number | null
  activeReplayDwellMs?: number
  heatmapWords?: readonly StoryGazeWordMetric[]
  heatmapVisible?: boolean
}>()

const imageFailed = ref(false)
const resolvedImageUrl = ref<string | null>(null)
let imageRequestSequence = 0
watch(
  () => [props.studentId, props.storyId, props.page.backgroundImageUrl] as const,
  async ([studentId, storyId, imageUrl]) => {
    const requestSequence = ++imageRequestSequence
    imageFailed.value = false
    resolvedImageUrl.value = null
    try {
      const resolved = await resolveTeacherStoryImage(studentId, storyId, imageUrl)
      if (requestSequence === imageRequestSequence) resolvedImageUrl.value = resolved
    } catch {
      if (requestSequence === imageRequestSequence) imageFailed.value = true
    }
  },
  { immediate: true },
)
interface StoryPreviewWord {
  readonly key: string
  readonly text: string
  readonly tokenIndex: number
}

const imageStateLabel = computed(() => {
  const labels: Record<Exclude<StoryImageGenerationStatus, 'AVAILABLE'>, string> = {
    NOT_REQUESTED: '아직 생성된 배경 이미지가 없어요.',
    PENDING: '배경 이미지를 생성하고 있어요.',
    FAILED: '배경 이미지를 불러오지 못했어요.',
  }
  return props.page.imageGenerationStatus === 'AVAILABLE'
    ? null
    : labels[props.page.imageGenerationStatus]
})

const activeReplayTokenIndexSet = computed(() => new Set(props.activeReplayTokenIndexes ?? []))
const maxHeatmapDwellMs = computed(() => Math.max(1, ...(props.heatmapWords ?? []).map((word) => word.dwellDurationMs)))
const heatmapByTokenIndex = computed(() => new Map(
  (props.heatmapWords ?? [])
    .filter((word) => word.tokenIndex !== null)
    .map((word) => [word.tokenIndex!, word]),
))

function splitStorySentences(source: string): string[] {
  const normalized = source
    .replace(/\s+([”’"])/g, '$1')
    .replace(/([”’"])(?=[가-힣])/g, '$1 ')
  const sentences: string[] = []
  let buffer = ''
  let insideDoubleQuote = false
  let insideSingleQuote = false

  for (const character of normalized) {
    buffer += character
    if (character === '“') insideDoubleQuote = true
    else if (character === '”') insideDoubleQuote = false
    else if (character === '‘') insideSingleQuote = true
    else if (character === '’') insideSingleQuote = false

    if (/[.!?。？！]/.test(character) && !insideDoubleQuote && !insideSingleQuote) {
      const sentence = buffer.trim()
      if (sentence) sentences.push(sentence)
      buffer = ''
    }
  }

  const remainder = buffer.trim()
  if (remainder) sentences.push(remainder)
  return sentences
}

const previewTextLines = computed(() => {
  let tokenIndex = 0
  const sentences = splitStorySentences(props.page.textLines.join(' ').trim())

  return sentences.map((sentence, lineIndex) =>
    sentence
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((text): StoryPreviewWord => {
        const word = {
          key: `${props.page.storyLineId}-${lineIndex}-${tokenIndex}-${text}`,
          text,
          tokenIndex,
        }
        tokenIndex += 1
        return word
      }),
  )
})

function wordReplayClass(word: StoryPreviewWord) {
  const isActive = !props.heatmapVisible && activeReplayTokenIndexSet.value.has(word.tokenIndex)
  const metric = heatmapByTokenIndex.value.get(word.tokenIndex)
  return {
    'is-replay-active': isActive,
    'is-replay-regression': isActive && props.activeReplayKind === 'regression',
    'is-replay-skip': isActive && props.activeReplayKind === 'skip',
    'is-replay-dwell': isActive && (props.activeReplayDwellMs ?? 0) > 0,
    'is-heatmap-skipped': props.heatmapVisible && metric?.skipped === true,
    'is-heatmap-regression': props.heatmapVisible && (metric?.regressionCount ?? 0) > 0,
  }
}

function wordHeatmapStyle(word: StoryPreviewWord) {
  if (!props.heatmapVisible) return undefined
  const gaze = heatmapByTokenIndex.value.get(word.tokenIndex)
  if (!gaze || gaze.dwellDurationMs <= 0) return undefined
  const intensity = 0.16 + 0.56 * Math.min(1, gaze.dwellDurationMs / maxHeatmapDwellMs.value)
  return { '--heatmap-intensity': intensity.toFixed(2) }
}

interface ReplayPath {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly width: number
  readonly height: number
}

const copyElement = ref<HTMLElement | null>(null)
const replayPath = ref<ReplayPath | null>(null)
const replayArrowId = computed(() => `story-replay-arrow-${props.page.storyLineId}`)
let copyResizeObserver: ResizeObserver | null = null

function updateReplayPath(): void {
  const copy = copyElement.value
  const fromTokenIndex = props.activeReplayFromTokenIndex
  const toTokenIndex = props.activeReplayToTokenIndex
  if (props.heatmapVisible || !copy || fromTokenIndex === null || fromTokenIndex === undefined || toTokenIndex === null || toTokenIndex === undefined || fromTokenIndex === toTokenIndex) {
    replayPath.value = null
    return
  }
  const from = copy.querySelector<HTMLElement>(`[data-token-index="${fromTokenIndex}"]`)
  const to = copy.querySelector<HTMLElement>(`[data-token-index="${toTokenIndex}"]`)
  if (!from || !to) {
    replayPath.value = null
    return
  }
  const copyRect = copy.getBoundingClientRect()
  const fromRect = from.getBoundingClientRect()
  const toRect = to.getBoundingClientRect()
  replayPath.value = {
    x1: fromRect.left - copyRect.left + fromRect.width / 2,
    y1: fromRect.top - copyRect.top + fromRect.height / 2,
    x2: toRect.left - copyRect.left + toRect.width / 2,
    y2: toRect.top - copyRect.top + toRect.height / 2,
    width: copy.clientWidth,
    height: copy.clientHeight,
  }
}

watch(
  () => [
    props.page.storyLineId,
    props.activeReplayFromTokenIndex,
    props.activeReplayToTokenIndex,
    props.heatmapVisible,
  ] as const,
  () => nextTick(updateReplayPath),
  { immediate: true },
)

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && copyElement.value) {
    copyResizeObserver = new ResizeObserver(updateReplayPath)
    copyResizeObserver.observe(copyElement.value)
  }
  updateReplayPath()
})

onBeforeUnmount(() => copyResizeObserver?.disconnect())
</script>

<template>
  <div class="story-page-preview">
    <section class="story-reader-frame" :aria-label="`이야기 ${page.pageNo}페이지 미리보기`">
      <div ref="copyElement" class="story-reader-copy">
        <svg
          v-if="replayPath && !heatmapVisible"
          class="story-reader-replay-path"
          :class="`is-${activeReplayKind ?? 'read'}`"
          :viewBox="`0 0 ${replayPath.width} ${replayPath.height}`"
          aria-hidden="true"
        >
          <defs>
            <marker :id="replayArrowId" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" />
            </marker>
          </defs>
          <line
            :x1="replayPath.x1"
            :y1="replayPath.y1"
            :x2="replayPath.x2"
            :y2="replayPath.y2"
            :marker-end="`url(#${replayArrowId})`"
          />
        </svg>
        <p v-for="(line, index) in previewTextLines" :key="`${page.storyLineId}-${index}`">
          <span
            v-for="word in line"
            :key="word.key"
            class="story-reader-word"
            :data-token-index="word.tokenIndex"
            :class="wordReplayClass(word)"
            :style="wordHeatmapStyle(word)"
          >
            {{ word.text }}{{ ' ' }}
          </span>
        </p>
        <p v-if="page.textLines.length === 0" class="story-reader-copy__empty">
          표시할 이야기 본문이 없습니다.
        </p>
      </div>
      <div class="story-reader-scene">
        <img
          v-if="resolvedImageUrl && !imageFailed"
          :src="resolvedImageUrl"
          :alt="`${page.pageNo}페이지 이야기 장면`"
          :style="{ objectPosition: page.backgroundImagePosition }"
          @error="imageFailed = true"
        />
        <div
          v-else
          class="story-reader-placeholder"
          :class="`is-${imageFailed ? 'failed' : page.imageGenerationStatus.toLowerCase()}`"
          role="img"
          :aria-label="imageStateLabel ?? '배경 이미지 없음'"
        >
          <span aria-hidden="true">✦</span>
          <p>{{ imageStateLabel }}</p>
        </div>
        <div class="story-reader-shade" aria-hidden="true" />
      </div>
    </section>

    <section
      v-if="page.branchRecord"
      class="story-branch-record"
      aria-labelledby="story-branch-record-title"
    >
      <header>
        <div>
          <p>이 페이지의 분기 기록</p>
          <h3 id="story-branch-record-title">학습자가 이야기한 내용</h3>
        </div>
        <time :datetime="page.branchRecord.createdAt">
          {{ formatStoryActivityAt(page.branchRecord.createdAt) }}
        </time>
      </header>
      <dl>
        <div>
          <dt>분기 질문</dt>
          <dd>{{ page.branchRecord.promptText }}</dd>
        </div>
        <div>
          <dt>학습자 답변</dt>
          <dd>{{ page.branchRecord.transcript }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.story-page-preview {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.story-reader-frame {
  display: grid;
  width: 100%;
  min-height: 0;
  gap: 8px;
  padding: 8px;
  border: 1px solid #eadfbf;
  border-radius: 18px;
  background: #fff9e7;
  box-shadow: var(--shadow-card);
}

.story-reader-scene {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 0;
  overflow: hidden;
  border-radius: 13px;
  background: #d6edff;
}

.story-reader-scene > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.story-reader-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  padding: 24px;
  background:
    radial-gradient(circle at 22% 24%, rgb(255 255 255 / 76%) 0 8%, transparent 9%),
    linear-gradient(145deg, #dceeff, #f4edff 54%, #fff4cf);
  color: #465778;
  text-align: center;
}

.story-reader-placeholder.is-pending {
  background: linear-gradient(145deg, #e8f4ff, #f2f7ff 54%, #fff7dc);
}

.story-reader-placeholder.is-failed {
  background: linear-gradient(145deg, #f4f5f7, #eceff4);
}

.story-reader-placeholder > span {
  color: #7598c6;
  font-size: clamp(28px, 5vw, 56px);
}

.story-reader-placeholder p {
  margin: 0;
  font-size: clamp(12px, 1.5vw, 16px);
  font-weight: 700;
}

.story-reader-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 72%, rgb(30 37 34 / 12%));
  pointer-events: none;
}

.story-reader-copy {
  position: relative;
  width: 100%;
  padding: clamp(18px, 3vw, 34px);
  border-radius: 13px;
  background: #fffdf7;
}

.story-reader-replay-path {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  overflow: visible;
  color: #2563eb;
  pointer-events: none;
}

.story-reader-replay-path line {
  stroke: currentcolor;
  stroke-width: 3;
  stroke-linecap: round;
}

.story-reader-replay-path path {
  fill: currentcolor;
}

.story-reader-replay-path.is-skip {
  color: #dc2626;
}

.story-reader-replay-path.is-regression {
  color: #d97706;
}

.story-reader-copy p {
  margin: 0 0 0.22em;
  color: #26364f;
  font-size: clamp(18px, 2.5vw, 32px);
  font-weight: 800;
  line-height: 1.55;
  letter-spacing: .025em;
  overflow-wrap: normal;
  text-align: left;
  text-shadow: none;
  word-break: keep-all;
}

.story-reader-word {
  position: relative;
  z-index: 3;
  display: inline-block;
  margin-right: 0.22em;
  border-radius: 0.12em;
}

.story-reader-word[style] {
  background: rgb(239 68 68 / var(--heatmap-intensity));
  box-shadow: 0 0 0 .08em rgb(185 28 28 / calc(var(--heatmap-intensity) * .65));
}

.story-reader-word.is-replay-active {
  background: linear-gradient(transparent 58%, rgb(96 165 250 / 34%) 58%);
  box-shadow: 0 0 0 0.06em rgb(37 99 235 / 42%);
}

.story-reader-word.is-replay-dwell {
  background: linear-gradient(transparent 58%, rgb(168 85 247 / 40%) 58%);
  box-shadow: 0 0 0 0.06em rgb(126 34 206 / 54%), 0 0 0.5em rgb(192 132 252 / 48%);
}

.story-reader-word.is-replay-regression {
  background: linear-gradient(transparent 58%, rgb(245 158 11 / 38%) 58%);
  box-shadow: 0 0 0 0.06em rgb(217 119 6 / 46%);
}

.story-reader-word.is-replay-skip {
  background: linear-gradient(transparent 58%, rgb(220 38 38 / 24%) 58%);
  box-shadow: 0 0 0 0.06em rgb(220 38 38 / 40%);
  text-decoration: underline dashed rgb(220 38 38 / 72%);
  text-underline-offset: 0.18em;
}

.story-reader-word.is-heatmap-skipped {
  text-decoration: underline dashed #dc2626;
  text-decoration-thickness: 2px;
  text-underline-offset: .2em;
}

.story-reader-word.is-heatmap-regression {
  box-shadow: 0 0 0 .08em #d97706;
}

.story-reader-copy .story-reader-copy__empty {
  color: #53627d;
  font-size: clamp(14px, 2vw, 22px);
}

.story-branch-record {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--primary-200);
  border-radius: var(--radius-md);
  background: var(--primary-50);
}

.story-branch-record header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.story-branch-record header p,
.story-branch-record h3 {
  margin: 0;
}

.story-branch-record header p,
.story-branch-record time {
  color: var(--primary-700);
  font-size: 11px;
}

.story-branch-record h3 {
  margin-top: 3px;
  color: var(--slate-900);
  font-size: 14px;
}

.story-branch-record dl {
  display: grid;
  margin: 0;
  gap: 8px;
}

.story-branch-record dl > div {
  display: grid;
  gap: 5px;
  padding: 11px 12px;
  border-radius: var(--radius-sm);
  background: rgb(255 255 255 / 72%);
}

.story-branch-record dt {
  color: var(--slate-500);
  font-size: 10px;
  font-weight: 750;
}

.story-branch-record dd {
  margin: 0;
  color: var(--slate-800);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .story-reader-frame {
    padding: 5px;
    border-radius: 14px;
  }

  .story-reader-scene {
    border-radius: 10px;
  }

  .story-reader-copy {
    padding: 16px;
  }

  .story-branch-record header {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
