<script setup lang="ts">
import { Button } from '@/components/ui/button'
import type { ReportMemoStatus } from '@/features/teacher/report'

defineProps<{
  memoDirty: boolean
  memoValid: boolean
  memoStatus: ReportMemoStatus
}>()

const emit = defineEmits<{
  back: []
  saveMemo: []
  cancelMemo: []
}>()
</script>

<template>
  <div class="report-actions">
    <div class="report-actions__group">
      <Button
        type="button"
        :disabled="!memoDirty || !memoValid || memoStatus === 'saving'"
        @click="emit('saveMemo')"
      >
        {{ memoStatus === 'saving' ? '저장 중…' : '저장' }}
      </Button>
      <Button
        variant="outline"
        type="button"
        :disabled="!memoDirty || memoStatus === 'saving'"
        @click="emit('cancelMemo')"
      >
        취소
      </Button>
    </div>
  </div>
</template>

<style scoped>
.report-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.report-actions__group {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
@media (max-width: 640px) {
  .report-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .report-actions__group {
    justify-content: stretch;
  }
  .report-actions__group :deep(button) {
    min-width: 120px;
    flex: 1 1 120px;
  }
}
</style>

