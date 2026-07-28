<script setup lang="ts">
import { Button } from '@/components/ui/button'
import type {
  ReportGazeRefreshStatus,
  ReportMemoStatus,
} from '@/features/teacher/report'

defineProps<{
  memoDirty: boolean
  memoStatus: ReportMemoStatus
  gazeRefreshStatus: ReportGazeRefreshStatus
}>()

const emit = defineEmits<{
  back: []
  saveMemo: []
  cancelMemo: []
  refreshGaze: []
}>()
</script>

<template>
  <div class="report-actions">
    <Button variant="outline" type="button" @click="emit('back')">
      보고서 목록
    </Button>
    <div class="report-actions__group">
      <Button
        variant="outline"
        type="button"
        :disabled="gazeRefreshStatus === 'refreshing'"
        @click="emit('refreshGaze')"
      >
        {{ gazeRefreshStatus === 'refreshing' ? '시선 결과 갱신 중…' : '시선 결과 갱신' }}
      </Button>
      <Button
        variant="ghost"
        type="button"
        :disabled="!memoDirty || memoStatus === 'saving'"
        @click="emit('cancelMemo')"
      >
        의견 취소
      </Button>
      <Button
        type="button"
        :disabled="!memoDirty || memoStatus === 'saving'"
        @click="emit('saveMemo')"
      >
        {{ memoStatus === 'saving' ? '의견 저장 중…' : '의견 저장' }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.report-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
