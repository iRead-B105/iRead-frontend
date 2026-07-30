<script setup lang="ts">
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import { formatStoryActivityAt, type StoryDetail } from '@/features/teacher/story'

defineProps<{
  detail: StoryDetail
}>()
</script>

<template>
  <div class="story-branches-tab">
    <AsyncStatePanel
      v-if="detail.branches.length === 0"
      kind="empty"
      title="저장된 분기 기록이 없어요"
      message="이 이야기에는 학습자가 응답한 분기 질문이 없습니다."
      compact
    />
    <ol v-else class="story-branches">
      <li v-for="(branch, index) in detail.branches" :key="branch.choiceId">
        <header>
          <span>{{ index + 1 }}</span>
          <strong>문장 {{ branch.branchLineId }}의 분기</strong>
          <time :datetime="branch.createdAt">{{ formatStoryActivityAt(branch.createdAt) }}</time>
        </header>
        <dl>
          <div>
            <dt>분기 질문</dt>
            <dd>{{ branch.promptText }}</dd>
          </div>
          <div>
            <dt>학습자 답변</dt>
            <dd>{{ branch.transcript }}</dd>
          </div>
        </dl>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.story-branches {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.story-branches > li {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
}

.story-branches header {
  display: grid;
  align-items: center;
  gap: 10px;
  grid-template-columns: 26px 1fr auto;
}

.story-branches header > span {
  display: grid;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 11px;
  font-weight: 800;
  place-items: center;
}

.story-branches strong {
  color: var(--slate-800);
  font-size: 13px;
}

.story-branches time {
  color: var(--slate-500);
  font-size: 11px;
}

.story-branches dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

.story-branches dl > div {
  display: grid;
  gap: 5px;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
}

.story-branches dt {
  color: var(--slate-500);
  font-size: 10px;
  font-weight: 750;
}

.story-branches dd {
  margin: 0;
  color: var(--slate-800);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 560px) {
  .story-branches header {
    grid-template-columns: 26px 1fr;
  }

  .story-branches time {
    grid-column: 2;
  }
}
</style>
