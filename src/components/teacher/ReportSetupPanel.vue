<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { REPORT_MEMO_MAX_LENGTH, type ReportPeriodErrors } from '@/features/teacher/report'

const props = defineProps<{
  studentName: string
  startDate: string
  endDate: string
  teacherMemo: string
  today: string
  periodErrors: ReportPeriodErrors
  memoError: string | null
  createError: string | null
  duplicateReportId: number | null
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:startDate': [value: string]
  'update:endDate': [value: string]
  'update:teacherMemo': [value: string]
  generate: []
  openDuplicate: []
}>()

const invalid = computed(
  () =>
    Boolean(props.periodErrors.startDate) ||
    Boolean(props.periodErrors.endDate) ||
    Boolean(props.memoError),
)

const reportSections = [
  { title: '학습 요약', description: '학습일, 시간, 완료 훈련과 평균 지표' },
  { title: '기간별 분석', description: '성장 기록, 영역 성취도와 어려운 낱말' },
  { title: '시선 추이', description: '훈련·검사별 네 가지 시선 집계 지표' },
  { title: '교수자 의견', description: '최대 2,000자의 선택 입력' },
]
</script>

<template>
  <Card class="report-setup" role="region" aria-labelledby="report-setup-title">
    <CardHeader class="report-setup__header">
      <div>
        <h2 id="report-setup-title">새 보고서</h2>
        <p>{{ studentName }} 학습자의 완료된 학습 기록을 기간별로 저장합니다.</p>
      </div>
    </CardHeader>

    <CardContent class="report-setup__body">
      <div class="report-period">
        <h3>보고서 기간</h3>
        <div class="report-period__fields">
          <div class="field">
            <Label for="report-start-date">시작일</Label>
            <Input
              id="report-start-date"
              type="date"
              required
              :value="startDate"
              :max="today"
              :aria-invalid="Boolean(periodErrors.startDate)"
              :aria-describedby="
                periodErrors.startDate ? 'report-start-date-error' : undefined
              "
              :disabled="submitting"
              @input="emit('update:startDate', ($event.target as HTMLInputElement).value)"
            />
            <p
              v-if="periodErrors.startDate"
              id="report-start-date-error"
              class="field-error"
            >
              {{ periodErrors.startDate }}
            </p>
          </div>
          <span aria-hidden="true">—</span>
          <div class="field">
            <Label for="report-end-date">종료일</Label>
            <Input
              id="report-end-date"
              type="date"
              required
              :value="endDate"
              :max="today"
              :aria-invalid="Boolean(periodErrors.endDate)"
              :aria-describedby="periodErrors.endDate ? 'report-end-date-error' : undefined"
              :disabled="submitting"
              @input="emit('update:endDate', ($event.target as HTMLInputElement).value)"
            />
            <p
              v-if="periodErrors.endDate"
              id="report-end-date-error"
              class="field-error"
            >
              {{ periodErrors.endDate }}
            </p>
          </div>
        </div>

        <div class="memo-field">
          <div class="memo-field__label">
            <Label for="report-initial-memo">교수자 의견 (선택)</Label>
            <span>{{ teacherMemo.length.toLocaleString('ko-KR') }}/{{ REPORT_MEMO_MAX_LENGTH.toLocaleString('ko-KR') }}</span>
          </div>
          <Textarea
            id="report-initial-memo"
            :value="teacherMemo"
            :maxlength="REPORT_MEMO_MAX_LENGTH"
            :aria-invalid="Boolean(memoError)"
            :aria-describedby="memoError ? 'report-initial-memo-error' : undefined"
            :disabled="submitting"
            placeholder="보고서에 함께 저장할 의견을 입력해 주세요."
            @input="emit('update:teacherMemo', ($event.target as HTMLTextAreaElement).value)"
          />
          <p v-if="memoError" id="report-initial-memo-error" class="field-error">
            {{ memoError }}
          </p>
        </div>
      </div>

      <div class="report-contents">
        <h3>저장되는 내용</h3>
        <ul>
          <li v-for="section in reportSections" :key="section.title">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>{{ section.title }}</strong>
              <small>{{ section.description }}</small>
            </div>
          </li>
        </ul>

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
          <Button
            type="button"
            :disabled="invalid || submitting"
            @click="emit('generate')"
          >
            {{ submitting ? '보고서 생성 중…' : '보고서 생성' }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.report-setup {
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
.report-setup__header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
}
.report-setup__body {
  display: grid;
  padding: 0;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.report-period,
.report-contents {
  padding: 22px 20px 24px;
}
.report-period {
  border-right: 1px solid var(--border);
}
.report-setup__body h3 {
  margin-bottom: 15px;
  font-size: 13px;
}
.report-period__fields {
  display: grid;
  align-items: start;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}
.report-period__fields > span {
  padding-top: 34px;
  color: var(--slate-400);
}
.field,
.memo-field {
  display: grid;
  gap: 7px;
}
.field-error {
  margin: 0;
  color: var(--destructive);
  font-size: 11px;
}
.memo-field {
  margin-top: 18px;
}
.memo-field__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.memo-field__label span {
  color: var(--muted-foreground);
  font-size: 10px;
}
.memo-field :deep(textarea) {
  min-height: 116px;
  line-height: 1.6;
}
.report-contents ul {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.report-contents li {
  display: grid;
  align-items: start;
  gap: 9px;
  padding: 10px;
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 55%, transparent);
  grid-template-columns: 16px minmax(0, 1fr);
}
.report-contents li > span {
  color: var(--primary-600);
  font-size: 11px;
  font-weight: 800;
}
.report-contents li div {
  display: grid;
  gap: 2px;
}
.report-contents strong {
  font-size: 12px;
}
.report-contents small {
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 1.45;
}
.create-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
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
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
@container (max-width: 800px) {
  .report-setup__body {
    grid-template-columns: 1fr;
  }
  .report-period {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}
@container (max-width: 520px) {
  .report-period__fields,
  .report-contents ul {
    grid-template-columns: 1fr;
  }
  .report-period__fields > span {
    display: none;
  }

  .report-period,
  .report-contents {
    padding: 18px 16px 20px;
  }

  .memo-field__label,
  .create-error {
    align-items: flex-start;
    flex-direction: column;
  }

  .report-setup__actions :deep([data-slot='button']) {
    width: 100%;
  }
}
</style>
