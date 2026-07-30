<script setup lang="ts">
import { computed, ref } from 'vue'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import type { StoryDetail, StoryScene } from '@/features/teacher/story'

const props = defineProps<{
  detail: StoryDetail
}>()

const failedImageIds = ref<readonly number[]>([])
const allNotRequested = computed(
  () =>
    props.detail.scenes.length > 0 &&
    props.detail.scenes.every((scene) => scene.imageGenerationStatus === 'NOT_REQUESTED'),
)

function canShowImage(scene: StoryScene): boolean {
  return (
    scene.imageGenerationStatus === 'AVAILABLE' &&
    scene.imageUrl !== null &&
    !failedImageIds.value.includes(scene.sceneId)
  )
}

function markImageFailed(sceneId: number): void {
  if (!failedImageIds.value.includes(sceneId)) {
    failedImageIds.value = [...failedImageIds.value, sceneId]
  }
}

function imageStateLabel(scene: StoryScene): string {
  if (scene.imageGenerationStatus === 'PENDING') return '이미지 생성 중'
  if (scene.imageGenerationStatus === 'FAILED') return '이미지 생성 실패'
  if (scene.imageGenerationStatus === 'NOT_REQUESTED') return '생성 요청 전'
  return failedImageIds.value.includes(scene.sceneId) ? '이미지를 불러오지 못함' : '생성 완료'
}

function imageStateClass(scene: StoryScene): string {
  if (failedImageIds.value.includes(scene.sceneId)) return 'is-failed'
  return `is-${scene.imageGenerationStatus.toLowerCase().replace('_', '-')}`
}
</script>

<template>
  <div class="story-images-tab">
    <AsyncStatePanel
      v-if="detail.scenes.length === 0 || allNotRequested"
      kind="empty"
      title="생성된 장면 이미지가 없어요"
      message="장면 이미지가 생성되면 순서대로 표시됩니다."
      compact
    />
    <ol v-else class="story-images">
      <li v-for="scene in detail.scenes" :key="scene.sceneId">
        <header>
          <span>{{ scene.sequenceNo }}</span>
          <strong>{{ scene.sequenceNo }}번째 장면</strong>
          <em :class="imageStateClass(scene)">
            {{ imageStateLabel(scene) }}
          </em>
        </header>
        <div v-if="canShowImage(scene)" class="story-image-frame">
          <img
            :src="scene.imageUrl!"
            :alt="`${scene.sequenceNo}번째 장면 생성 이미지`"
            @error="markImageFailed(scene.sceneId)"
          />
        </div>
        <div v-else class="story-image-state" :class="imageStateClass(scene)">
          <span aria-hidden="true">이미지</span>
          <strong>{{ imageStateLabel(scene) }}</strong>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.story-images {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.story-images > li {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
}

.story-images header {
  display: grid;
  align-items: center;
  gap: 8px;
  grid-template-columns: 24px 1fr auto;
}

.story-images header > span {
  display: grid;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 10px;
  font-weight: 800;
  place-items: center;
}

.story-images strong {
  color: var(--slate-800);
  font-size: 12px;
}

.story-images em {
  padding: 4px 7px;
  border-radius: 999px;
  background: var(--slate-100);
  color: var(--slate-600);
  font-size: 9px;
  font-style: normal;
  font-weight: 750;
}

.story-images em.is-available {
  background: color-mix(in oklch, var(--success-600) 12%, transparent);
  color: var(--success-600);
}

.story-images em.is-pending {
  background: color-mix(in oklch, var(--warning-500) 14%, transparent);
  color: var(--warning-600);
}

.story-images em.is-failed {
  background: color-mix(in oklch, var(--danger-600) 10%, transparent);
  color: var(--danger-600);
}

.story-image-frame,
.story-image-state {
  display: grid;
  min-height: 190px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
  place-items: center;
}

.story-image-frame img {
  width: 100%;
  height: 100%;
  min-height: 190px;
  object-fit: cover;
}

.story-image-state {
  align-content: center;
  gap: 8px;
  border: 1px dashed var(--slate-300);
  color: var(--slate-500);
}

.story-image-state > span {
  display: grid;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--white);
  font-size: 10px;
  font-weight: 750;
  place-items: center;
}

.story-image-state.is-failed {
  border-color: color-mix(in oklch, var(--danger-600) 25%, var(--slate-200));
  color: var(--danger-600);
}

@media (max-width: 720px) {
  .story-images {
    grid-template-columns: 1fr;
  }
}
</style>
