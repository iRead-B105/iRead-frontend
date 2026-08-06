<script setup lang="ts">
import { computed, watch } from 'vue'
import SaveToast from '@/components/common/SaveToast.vue'
import ReportActionPanel from '@/components/teacher/ReportActionPanel.vue'
import ReportGazeTrend from '@/components/teacher/ReportGazeTrend.vue'
import ReportLearningSnapshot from '@/components/teacher/ReportLearningSnapshot.vue'
import { Textarea } from '@/components/ui/textarea'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import {
  formatReportDate,
  formatReportDateTime,
  hasAlignedReportLearningMetrics,
  REPORT_MEMO_MAX_LENGTH,
  validateTeacherMemo,
  type ReportDetail,
  type ReportMemoStatus,
} from '@/features/teacher/report'

const props = defineProps<{
  report: ReportDetail
  studentName: string
  studentSchool: string | null
  teacherName: string | null
  teacherOrganization: string | null
  teacherMemoDraft: string
  memoDirty: boolean
  memoStatus: ReportMemoStatus
  memoError: string | null
}>()

const { visible: memoSavedVisible, show: showMemoSaved } = useTemporaryNotice()
const { visible: memoErrorVisible, show: showMemoError } = useTemporaryNotice()

const alignedLearningMetrics = computed(() =>
  hasAlignedReportLearningMetrics(props.report.snapshot),
)
const memoValidationError = computed(() => validateTeacherMemo(props.teacherMemoDraft))
const displayedMemoError = computed(() => memoValidationError.value ?? props.memoError)

watch(
  () => props.memoStatus,
  (status) => {
    if (status === 'saved') showMemoSaved()
  },
)

watch(
  displayedMemoError,
  (error) => {
    if (error) showMemoError()
  },
  { immediate: true },
)

const emit = defineEmits<{
  'update:teacherMemoDraft': [value: string]
  back: []
  saveMemo: []
  cancelMemo: []
}>()
</script>

<template>
  <article class="learning-report" aria-label="학습 보고서 상세">
    <header class="learning-report__header">
      <div class="learning-report__brand">
        <img :src="'/images/iread-logo.png'" alt="iRead" />
      </div>
      <div class="learning-report__title">
        <h1>{{ studentName }} 학습 보고서</h1>
        <span
          >{{ formatReportDate(report.startDate) }} – {{ formatReportDate(report.endDate) }}</span
        >
      </div>
    </header>

    <dl class="report-profile">
      <div>
        <dt>학습자</dt>
        <dd>{{ studentName }}</dd>
      </div>
      <div>
        <dt>학교</dt>
        <dd>{{ studentSchool || '-' }}</dd>
      </div>
      <div>
        <dt>보고서 기간</dt>
        <dd>{{ formatReportDate(report.startDate) }} – {{ formatReportDate(report.endDate) }}</dd>
      </div>
      <div>
        <dt>생성일</dt>
        <dd>{{ formatReportDateTime(report.createdAt) }}</dd>
      </div>
      <div>
        <dt>담당 교수자</dt>
        <dd>{{ teacherName || '-' }}</dd>
      </div>
      <div>
        <dt>소속</dt>
        <dd>{{ teacherOrganization || '-' }}</dd>
      </div>
    </dl>

    <ReportLearningSnapshot :snapshot="report.snapshot" />
    <ReportGazeTrend
      :trend="report.snapshot.gazeTrend"
      :show-automatic-analysis="alignedLearningMetrics"
    />

    <section class="report-opinion" aria-labelledby="opinion-title">
      <header>
        <div>
          <h2 id="opinion-title">교수자 의견</h2>
        </div>
        <span
          >{{ teacherMemoDraft.length.toLocaleString('ko-KR') }}/{{
            REPORT_MEMO_MAX_LENGTH.toLocaleString('ko-KR')
          }}</span
        >
      </header>
      <Textarea
        :model-value="teacherMemoDraft"
        :maxlength="REPORT_MEMO_MAX_LENGTH"
        aria-label="교수자 의견"
        :aria-invalid="Boolean(displayedMemoError)"
        placeholder="저장할 교수자 의견을 입력해 주세요. 공백만 저장하면 의견이 삭제됩니다."
        @update:model-value="emit('update:teacherMemoDraft', String($event))"
      />
      <SaveToast :visible="memoSavedVisible" message="교수자 의견이 저장되었습니다." />
      <SaveToast :visible="memoErrorVisible" :message="displayedMemoError ?? undefined" tone="error" />
      <ReportActionPanel
        :memo-dirty="memoDirty"
        :memo-valid="!memoValidationError"
        :memo-status="memoStatus"
        @back="emit('back')"
        @save-memo="emit('saveMemo')"
        @cancel-memo="emit('cancelMemo')"
      />
    </section>

    <footer class="learning-report__footer">
      <span>iRead 학습 관리</span>
      <span>보고서 ID {{ report.reportId }}</span>
    </footer>
  </article>
</template>

<style scoped>
.learning-report {
  width: min(100%, 960px);
  margin: 0 auto;
  padding: 42px 48px 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--foreground);
}

.learning-report__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 24px;
  border-bottom: 2px solid var(--slate-950);
}
.learning-report__brand {
  display: grid;
  width: 78px;
  height: 38px;
  overflow: hidden;
  place-items: center;
}
.learning-report__brand img {
  width: 66px;
  height: 38px;
  max-width: none;
  object-fit: contain;
  transform: scale(1.8);
}
.learning-report__title {
  text-align: right;
}
.learning-report__title h1 {
  margin: 0 0 5px;
  font-size: 25px;
}
.learning-report__title span {
  color: var(--muted-foreground);
  font-size: 12px;
}
.report-profile {
  display: grid;
  margin: 0;
  padding: 17px 0;
  border-bottom: 1px solid var(--border);
  gap: 12px 28px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.report-profile div {
  display: grid;
  gap: 12px;
  grid-template-columns: 82px minmax(0, 1fr);
}
.report-profile dt {
  color: var(--muted-foreground);
  font-size: 11px;
}
.report-profile dd {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  overflow-wrap: anywhere;
}
.report-opinion {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}
.report-opinion > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}
.report-opinion h2 {
  margin: 0;
  font-size: 17px;
}
.report-opinion header > span {
  color: var(--muted-foreground);
  font-size: 10px;
}
.report-opinion :deep(textarea) {
  min-height: 126px;
  line-height: 1.65;
}
.save-state,
.error-state {
  margin: 8px 0 0;
  font-size: 11px;
}
.save-state {
  color: var(--success-600);
}
.error-state {
  color: var(--destructive);
}
.learning-report__footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 28px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  color: var(--muted-foreground);
  font-size: 9px;
}
@media (max-width: 720px) {
  .learning-report {
    padding: 28px 22px 24px;
  }
  .report-profile {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .learning-report {
    padding: 22px 16px 20px;
    border-right: 0;
    border-left: 0;
  }

  .learning-report__header,
  .report-opinion > header,
  .learning-report__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .learning-report__title {
    text-align: left;
  }

  .learning-report__title h1 {
    font-size: 22px;
    overflow-wrap: anywhere;
  }

  .report-profile div {
    gap: 4px;
    grid-template-columns: 1fr;
  }
}
</style>
