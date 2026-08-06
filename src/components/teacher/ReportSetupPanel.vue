<script setup lang="ts">
import { computed } from 'vue'
import ReportPeriodCalendar from '@/components/teacher/ReportPeriodCalendar.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { ReportPeriodErrors } from '@/features/teacher/report'
import type { StudentRequestStatus } from '@/features/teacher/student'

const props = defineProps<{
  startDate: string
  endDate: string
  today: string
  periodErrors: ReportPeriodErrors
  createError: string | null
  duplicateReportId: number | null
  submitting: boolean
  completedTrainingCount: number
  learningDayCount: number
  completedDateCounts: Readonly<Record<string, number>>
  historyStatus: StudentRequestStatus
  historyError: string | null
}>()

const emit = defineEmits<{
  'update:startDate': [value: string]
  'update:endDate': [value: string]
  generate: []
  openDuplicate: []
  visibleRange: [range: { from: string; to: string }]
  retryHistory: []
}>()

const invalid = computed(
  () =>
    Boolean(props.periodErrors?.startDate) ||
    Boolean(props.periodErrors?.endDate) ||
    props.historyStatus !== 'success' ||
    props.learningDayCount < 1,
)
</script>

<template>
  <Card class="report-setup" role="region" aria-labelledby="report-setup-title">
    <CardHeader class="report-setup__header">
      <div>
        <h2 id="report-setup-title">보고서 설정</h2>
      </div>
    </CardHeader>

    <CardContent class="report-setup__body">
      <div class="report-period">
        <h3>조회 기간</h3>
        <ReportPeriodCalendar
          :start-date="startDate"
          :end-date="endDate"
          :today="today"
          :completed-date-counts="completedDateCounts"
          :history-status="historyStatus"
          :history-error="historyError"
          :disabled="submitting"
          @update:start-date="emit('update:startDate', $event)"
          @update:end-date="emit('update:endDate', $event)"
          @visible-range="emit('visibleRange', $event)"
          @retry="emit('retryHistory')"
        />
        <p v-if="periodErrors?.startDate || periodErrors?.endDate" class="field-error">
          {{ periodErrors?.startDate ?? periodErrors?.endDate }}
        </p>
        <p v-else-if="historyStatus === 'success' && learningDayCount < 1" class="field-error">
          보고서를 생성하려면 완료 학습일이 1일 이상 필요합니다.
        </p>
      </div>

      <div v-if="createError" class="create-error" role="alert">
        <p>{{ createError }}</p>
        <Button
          v-if="duplicateReportId !== null"
          variant="outline"
          size="sm"
          type="button"
          @click="emit('openDuplicate')"
        >
          기존 보고서 열기
        </Button>
      </div>

      <div class="report-setup__actions">
        <Button type="button" :disabled="invalid || submitting" @click="emit('generate')">
          {{ submitting ? '보고서 생성 중…' : '보고서 생성' }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.report-setup {
  container-type: inline-size;
  gap: 0;
  overflow: hidden;
  padding: 0;
  border-radius: var(--radius-lg);
}
.report-setup__header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}
.report-setup__header h2,
.report-setup__body h3 {
  margin: 0;
}
.report-setup__header h2 {
  font-size: 17px;
}
.report-setup__body {
  display: grid;
  padding: 0;
  grid-template-columns: 1fr;
}
.report-period {
  padding: 22px 20px 24px;
}
.report-setup__body h3 {
  margin-bottom: 15px;
  font-size: 13px;
}
.field-error {
  margin: 9px 0 0;
  color: var(--destructive);
  font-size: 11px;
}
.create-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 20px 16px;
  padding: 10px 12px;
  border: 1px solid color-mix(in oklch, var(--destructive) 25%, var(--border));
  border-radius: var(--radius-sm);
  color: var(--destructive);
  font-size: 11px;
}
.create-error p {
  margin: 0;
}
.report-setup__actions {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--border);
}
@container (max-width: 520px) {
  .report-period {
    padding: 18px 16px 20px;
  }

  .create-error {
    align-items: flex-start;
    flex-direction: column;
  }

  .report-setup__actions :deep([data-slot='button']) {
    width: 100%;
  }
}
</style>
