<script setup lang="ts">
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import type { StoryDetail } from '@/features/teacher/story'
import { formatStoryActivityAt } from '@/features/teacher/story'

defineProps<{
  detail: StoryDetail
}>()
</script>

<template>
  <div class="story-content-tab">
    <AsyncStatePanel
      v-if="detail.scenes.length === 0"
      kind="empty"
      title="표시할 이야기 내용이 없어요"
      message="아직 생성된 장면과 문장이 없습니다."
      compact
    />
    <ol v-else class="story-scenes">
      <li v-for="scene in detail.scenes" :key="scene.sceneId">
        <header>
          <span>{{ scene.sequenceNo }}</span>
          <h3>{{ scene.sequenceNo }}번째 장면</h3>
        </header>
        <AsyncStatePanel
          v-if="scene.lines.length === 0"
          kind="empty"
          title="이 장면에는 표시할 문장이 없어요"
          message="장면의 문장이 생성되면 순서대로 표시됩니다."
          compact
        />
        <ol v-else class="story-lines">
          <li v-for="line in scene.lines" :key="line.lineId">
            <span class="story-line-order">{{ line.lineOrder }}</span>
            <p>{{ line.lineText }}</p>
            <div class="story-line-state">
              <span v-if="line.requiresBranchInput" class="is-branch">분기 문장</span>
              <span :class="line.readAt ? 'is-read' : 'is-unread'">
                {{ line.readAt ? '읽음' : '읽기 전' }}
              </span>
              <time v-if="line.readAt" :datetime="line.readAt">
                {{ formatStoryActivityAt(line.readAt) }}
              </time>
            </div>
          </li>
        </ol>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.story-content-tab {
  display: grid;
}

.story-scenes,
.story-lines {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.story-scenes > li {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--slate-50);
}

.story-scenes header {
  display: flex;
  align-items: center;
  gap: 9px;
}

.story-scenes header > span {
  display: grid;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--primary-600);
  color: var(--white);
  font-size: 11px;
  font-weight: 800;
  place-items: center;
}

.story-scenes h3 {
  margin: 0;
  color: var(--slate-900);
  font-size: 14px;
}

.story-lines {
  gap: 8px;
}

.story-lines li {
  display: grid;
  align-items: start;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-sm);
  background: var(--white);
  grid-template-columns: 24px minmax(0, 1fr) auto;
}

.story-line-order {
  color: var(--slate-400);
  font-size: 11px;
  font-weight: 800;
  text-align: center;
}

.story-lines p {
  margin: 0;
  color: var(--slate-800);
  font-size: 13px;
  line-height: 1.6;
}

.story-line-state {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
}

.story-line-state span {
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 750;
}

.is-branch {
  background: var(--primary-50);
  color: var(--primary-700);
}

.is-read {
  background: color-mix(in oklch, var(--success-600) 12%, transparent);
  color: var(--success-600);
}

.is-unread {
  background: var(--slate-100);
  color: var(--slate-500);
}

.story-line-state time {
  color: var(--slate-400);
  font-size: 10px;
}

@media (max-width: 720px) {
  .story-lines li {
    grid-template-columns: 24px minmax(0, 1fr);
  }

  .story-line-state {
    justify-content: flex-start;
    grid-column: 2;
  }
}
</style>
