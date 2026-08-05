<script setup lang="ts">
import { Button } from '@/components/ui/button'

const props = defineProps<{
  currentPageNo: number
  totalPages: number
}>()

defineEmits<{
  previous: []
  next: []
}>()
</script>

<template>
  <nav class="story-page-navigator" aria-label="이야기 페이지 이동">
    <Button
      type="button"
      variant="outline"
      :disabled="props.currentPageNo <= 1"
      @click="$emit('previous')"
    >
      이전 페이지
    </Button>
    <span role="status" :aria-label="`현재 ${currentPageNo}페이지, 전체 ${totalPages}페이지`">
      <strong>{{ currentPageNo }}</strong>
      <span>/</span>
      <span>{{ totalPages }}</span>
    </span>
    <Button
      type="button"
      variant="outline"
      :disabled="props.currentPageNo >= props.totalPages"
      @click="$emit('next')"
    >
      다음 페이지
    </Button>
  </nav>
</template>

<style scoped>
.story-page-navigator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: 18px;
  border-top: 1px solid var(--slate-200);
}

.story-page-navigator > span {
  display: flex;
  min-width: 92px;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  color: var(--slate-500);
  font-size: 12px;
}

.story-page-navigator strong {
  color: var(--primary-700);
  font-size: 16px;
}

@media (max-width: 480px) {
  .story-page-navigator {
    gap: 8px;
  }

  .story-page-navigator > span {
    min-width: 64px;
  }
}
</style>
