<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import LearningReportDocument from '@/components/teacher/LearningReportDocument.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import ReportPreview from '@/components/teacher/ReportPreview.vue'
import ReportSetupPanel from '@/components/teacher/ReportSetupPanel.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  formatReportDate,
  formatReportDateTime,
  localDateString,
  parsePositiveReportId,
  validateReportPeriod,
  type ReportListItem,
} from '@/features/teacher/report'
import { asyncStateKind } from '@/features/teacher/error'
import { useReportStore } from '@/stores/report'
import { useSessionStore } from '@/stores/session'
import { useStudentStore } from '@/stores/students'

const route = useRoute()
const router = useRouter()
const reportStore = useReportStore()
const studentStore = useStudentStore()
const sessionStore = useSessionStore()
const {
  reports,
  selectedReportId,
  selectedReport,
  startDate,
  endDate,
  teacherMemoDraft,
  listStatus,
  detailStatus,
  createStatus,
  memoStatus,
  gazeRefreshStatus,
  listError,
  listUiError,
  detailError,
  detailUiError,
  createError,
  memoError,
  gazeRefreshError,
  duplicateReportId,
  memoDirty,
} = storeToRefs(reportStore)
const { detailsById, navigationItemsById, detailStatusById, detailErrorById } =
  storeToRefs(studentStore)
const { teacher } = storeToRefs(sessionStore)

const reportQuery = ref('')
const today = localDateString()
const studentId = computed(() => parsePositiveReportId(route.params.id))
const invalidStudentId = computed(() => studentId.value === null)
const listErrorKind = computed(() => asyncStateKind(listUiError.value))
const detailErrorKind = computed(() => asyncStateKind(detailUiError.value))
const studentDetail = computed(() =>
  studentId.value === null ? null : (detailsById.value[studentId.value] ?? null),
)
const studentNavigation = computed(() =>
  studentId.value === null ? null : (navigationItemsById.value[studentId.value] ?? null),
)
const studentName = computed(() => studentDetail.value?.name ?? studentNavigation.value?.name ?? '')
const studentSchool = computed(
  () => studentDetail.value?.school ?? studentNavigation.value?.school ?? null,
)
const studentLoadStatus = computed(() =>
  studentId.value === null ? 'idle' : (detailStatusById.value[studentId.value] ?? 'idle'),
)
const studentLoadError = computed(() =>
  studentId.value === null ? null : (detailErrorById.value[studentId.value] ?? null),
)
const periodErrors = computed(() => validateReportPeriod(startDate.value, endDate.value, today))
const filteredReports = computed(() => {
  const query = reportQuery.value.trim().toLowerCase()
  if (!query) return reports.value
  return reports.value.filter((report) =>
    `${report.createdAt} ${report.startDate} ${report.endDate}`.toLowerCase().includes(query),
  )
})

watch(
  studentId,
  async (id) => {
    reportQuery.value = ''
    if (id === null) {
      reportStore.reset()
      return
    }
    await Promise.all([
      detailsById.value[id] && studentStore.detailStaleById[id] !== true
        ? Promise.resolve(detailsById.value[id])
        : studentStore.loadDetail(id),
      reportStore.loadForStudent(id),
    ])
  },
  { immediate: true },
)

async function generateReport(): Promise<void> {
  if (studentId.value === null) return
  await reportStore.createReport(studentId.value)
}

async function selectReport(report: ReportListItem): Promise<void> {
  await reportStore.selectReport(report.reportId)
}

async function retryStudent(): Promise<void> {
  if (studentId.value === null) return
  await studentStore.loadDetail(studentId.value)
}
</script>

<template>
  <div class="report page-stack">
    <PageHeader title="보고서" />

    <AsyncStatePanel
      v-if="invalidStudentId"
      kind="not-found"
      title="올바른 학습자를 선택해 주세요."
      message="보고서를 확인하려면 학습자 목록에서 대상을 다시 선택해야 합니다."
      action-label="학습자 목록으로 이동"
      @action="router.push({ name: 'teacher-students' })"
    />

    <template v-else>
      <AsyncStatePanel
        v-if="!studentName && studentLoadStatus === 'loading'"
        kind="loading"
        message="학습자 정보를 불러오는 중입니다."
      />
      <AsyncStatePanel
        v-else-if="!studentName && studentLoadStatus === 'error'"
        kind="error"
        title="학습자 정보를 불러오지 못했습니다"
        :message="studentLoadError ?? '잠시 후 다시 시도해 주세요.'"
        retry-label="다시 불러오기"
        @retry="retryStudent"
      />

      <template v-else-if="selectedReportId !== null">
        <AsyncStatePanel
          v-if="detailStatus === 'loading'"
          kind="loading"
          message="보고서 상세를 불러오는 중입니다."
        />
        <AsyncStatePanel
          v-else-if="detailStatus === 'error'"
          :kind="detailErrorKind"
          title="선택한 보고서를 불러오지 못했습니다"
          :message="detailError ?? '잠시 후 다시 시도해 주세요.'"
          :retry-label="detailUiError?.retryable ? '다시 불러오기' : undefined"
          action-label="보고서 목록"
          @retry="reportStore.selectReport(selectedReportId)"
          @action="reportStore.startNewReport()"
        />
        <ReportPreview v-else-if="selectedReport">
          <LearningReportDocument
            :report="selectedReport"
            :student-name="studentName"
            :student-school="studentSchool"
            :teacher-name="teacher?.name ?? null"
            :teacher-organization="teacher?.organization ?? null"
            :teacher-memo-draft="teacherMemoDraft"
            :memo-dirty="memoDirty"
            :memo-status="memoStatus"
            :memo-error="memoError"
            :gaze-refresh-status="gazeRefreshStatus"
            :gaze-refresh-error="gazeRefreshError"
            @update:teacher-memo-draft="reportStore.setTeacherMemoDraft"
            @back="reportStore.startNewReport()"
            @save-memo="reportStore.saveTeacherMemo()"
            @cancel-memo="reportStore.cancelTeacherMemo()"
            @refresh-gaze="reportStore.refreshGazeTrend()"
          />
        </ReportPreview>
      </template>

      <div v-else class="report-start-workspace">
        <Card class="saved-reports" aria-labelledby="saved-reports-title">
          <CardHeader class="saved-reports__header">
            <div>
              <CardTitle id="saved-reports-title">저장된 보고서</CardTitle>
            </div>
            <strong>{{ reports.length }}개</strong>
          </CardHeader>
          <div class="saved-reports__filter">
            <Input
              v-model="reportQuery"
              type="search"
              aria-label="저장된 보고서 검색"
              placeholder="생성일 또는 보고서 기간 검색"
            />
          </div>
          <CardContent class="saved-reports__content">
            <AsyncStatePanel
              v-if="listStatus === 'loading' && reports.length === 0"
              kind="loading"
              message="저장된 보고서를 불러오는 중입니다."
              compact
            />
            <AsyncStatePanel
              v-else-if="listStatus === 'error' && reports.length === 0"
              :kind="listErrorKind"
              title="저장된 보고서를 불러오지 못했습니다"
              :message="listError ?? '잠시 후 다시 시도해 주세요.'"
              :retry-label="listUiError?.retryable ? '다시 불러오기' : undefined"
              compact
              @retry="studentId && reportStore.loadList(studentId)"
            />
            <AsyncStatePanel
              v-else-if="listStatus === 'ready' && reports.length === 0"
              kind="empty"
              message="저장된 보고서가 없습니다. 새 보고서를 생성해 주세요."
              compact
            />
            <template v-else>
              <AsyncStatePanel
                v-if="listStatus === 'error'"
                :kind="listErrorKind"
                title="최신 보고서 목록을 불러오지 못했습니다"
                :message="`${listError ?? '잠시 후 다시 시도해 주세요.'} 이전 목록을 계속 표시합니다.`"
                :retry-label="listUiError?.retryable ? '다시 불러오기' : undefined"
                compact
                @retry="studentId && reportStore.loadList(studentId)"
              />
              <AsyncStatePanel
                v-else-if="listStatus === 'loading'"
                kind="loading"
                message="최신 목록을 확인하는 동안 이전 보고서를 표시합니다."
                compact
              />
              <AsyncStatePanel
                v-if="filteredReports.length === 0"
                kind="empty"
                message="검색 조건에 맞는 보고서가 없습니다."
                compact
              />
              <ul v-else>
                <li v-for="item in filteredReports" :key="item.reportId">
                  <Button
                    variant="ghost"
                    class="saved-report-row"
                    type="button"
                    @click="selectReport(item)"
                  >
                    <span>
                      <strong>{{ formatReportDateTime(item.createdAt) }} 생성</strong>
                      <small>
                        {{ formatReportDate(item.startDate) }} ~
                        {{ formatReportDate(item.endDate) }}
                      </small>
                    </span>
                    <b aria-hidden="true">›</b>
                  </Button>
                </li>
              </ul>
            </template>
          </CardContent>
        </Card>

        <ReportSetupPanel
          v-model:start-date="startDate"
          v-model:end-date="endDate"
          :today="today"
          :period-errors="periodErrors"
          :create-error="createError"
          :duplicate-report-id="duplicateReportId"
          :submitting="createStatus === 'submitting'"
          @generate="generateReport"
          @open-duplicate="reportStore.openDuplicateReport()"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.report {
  width: 100%;
  container-type: inline-size;
}
.report-start-workspace {
  display: grid;
  align-items: stretch;
  gap: 20px;
  grid-template-columns: 340px minmax(0, 1fr);
}
.saved-reports {
  display: grid;
  max-height: 620px;
  gap: 0;
  overflow: hidden;
  padding: 0;
  grid-template-rows: auto auto minmax(0, 1fr);
}
.saved-reports__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-bottom: 1px solid var(--border);
}
.saved-reports__header :deep([data-slot='card-title']) {
  font-size: 16px;
}
.saved-reports__header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 11px;
}
.saved-reports__header > strong {
  color: var(--muted-foreground);
  font-size: 11px;
}
.saved-reports__filter {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}
.saved-reports__content {
  min-height: 0;
  overflow-y: auto;
  padding: 8px 10px 10px;
}
.saved-reports ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.saved-report-row {
  display: flex;
  width: 100%;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  text-align: left;
}
.saved-report-row > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.saved-report-row strong {
  font-size: 12px;
  overflow-wrap: anywhere;
}
.saved-report-row small {
  color: var(--muted-foreground);
  font-size: 10px;
}
.saved-report-row b {
  color: var(--muted-foreground);
  font-size: 18px;
}
.section-state,
.state-card {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  min-height: 180px;
  color: var(--muted-foreground);
  font-size: 12px;
  text-align: center;
}
.section-state p,
.state-card p {
  margin: 0;
}
.state-card {
  padding: 24px;
}
.section-state--error,
.state-card--error {
  color: var(--destructive);
}
.state-actions {
  display: flex;
  gap: 8px;
}
@container (max-width: 980px) {
  .report-start-workspace {
    grid-template-columns: 1fr;
  }
  .saved-reports {
    max-height: 430px;
  }
}

@container (max-width: 480px) {
  .saved-reports__header,
  .saved-report-row,
  .state-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .saved-reports {
    max-height: 380px;
  }

  .saved-report-row b {
    align-self: flex-end;
  }
}
</style>
