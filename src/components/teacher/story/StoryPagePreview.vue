<script setup lang="ts">
import { computed } from 'vue'
import {
  formatStoryActivityAt,
  type StoryImageGenerationStatus,
  type StoryPage,
} from '@/features/teacher/story'

const props = defineProps<{
  page: StoryPage
  activeReplayKind?: 'read' | 'regression' | 'skip' | null
  activeReplayTokenIndexes?: readonly number[]
  activeReplayDwellMs?: number
}>()

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

const previewTextLines = computed(() => {
  let tokenIndex = 0
  return props.page.textLines.map((line, lineIndex) =>
    line
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
  const isActive = activeReplayTokenIndexSet.value.has(word.tokenIndex)
  return {
    'is-replay-active': isActive,
    'is-replay-regression': isActive && props.activeReplayKind === 'regression',
    'is-replay-skip': isActive && props.activeReplayKind === 'skip',
    'is-replay-dwell': isActive && (props.activeReplayDwellMs ?? 0) > 0,
  }
}
</script>

<template>
  <div class="story-page-preview">
    <section class="story-reader-frame" :aria-label="`이야기 ${page.pageNo}페이지 미리보기`">
      <div class="story-reader-scene">
        <img
          v-if="page.backgroundImageUrl"
          :src="page.backgroundImageUrl"
          :alt="`${page.pageNo}페이지 이야기 장면`"
          :style="{ objectPosition: page.backgroundImagePosition }"
        />
        <div
          v-else
          class="story-reader-placeholder"
          :class="`is-${page.imageGenerationStatus.toLowerCase()}`"
          role="img"
          :aria-label="imageStateLabel ?? '배경 이미지 없음'"
        >
          <span aria-hidden="true">✦</span>
          <p>{{ imageStateLabel }}</p>
        </div>
        <div class="story-reader-shade" aria-hidden="true" />
        <div class="story-reader-copy">
          <p v-for="(line, index) in previewTextLines" :key="`${page.storyLineId}-${index}`">
            <span
              v-for="word in line"
              :key="word.key"
              class="story-reader-word"
              :class="wordReplayClass(word)"
            >
              {{ word.text }}{{ ' ' }}
            </span>
          </p>
          <p v-if="page.textLines.length === 0" class="story-reader-copy__empty">
            표시할 이야기 본문이 없습니다.
          </p>
        </div>
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
  position: relative;
  width: 100%;
  aspect-ratio: 1520 / 850;
  min-height: 0;
  padding: 8px;
  border: 1px solid #eadfbf;
  border-radius: 18px;
  background: #fff9e7;
  box-shadow: var(--shadow-card);
}

.story-reader-scene {
  position: relative;
  width: 100%;
  height: 100%;
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
  inset: 34% 0 0;
  background: linear-gradient(transparent, rgb(30 37 34 / 16%) 42%, rgb(30 37 34 / 38%));
  pointer-events: none;
}

.story-reader-copy {
  position: absolute;
  z-index: 2;
  top: clamp(34px, 10%, 76px);
  left: clamp(34px, 8%, 88px);
  width: min(68%, 760px);
  max-height: 72%;
  overflow: hidden;
}

.story-reader-copy p {
  margin: 0 0 0.22em;
  color: #132b67;
  font-size: clamp(18px, 3.1vw, 40px);
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 0;
  overflow-wrap: normal;
  text-align: left;
  text-shadow:
    0 2px 0 rgb(255 255 255 / 80%),
    0 0 12px rgb(255 252 225 / 92%);
  word-break: keep-all;
}

.story-reader-word {
  position: relative;
  display: inline-block;
  margin-right: 0.22em;
  border-radius: 0.12em;
}

.story-reader-word.is-replay-active {
  background: linear-gradient(transparent 58%, rgb(96 165 250 / 34%) 58%);
  box-shadow: 0 0 0 0.06em rgb(37 99 235 / 42%);
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

.story-reader-word.is-replay-dwell {
  background: linear-gradient(transparent 58%, rgb(168 85 247 / 40%) 58%);
  box-shadow: 0 0 0 0.06em rgb(126 34 206 / 54%), 0 0 0.5em rgb(192 132 252 / 48%);
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
    top: 14%;
    left: 8%;
    width: 76%;
  }

  .story-branch-record header {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
