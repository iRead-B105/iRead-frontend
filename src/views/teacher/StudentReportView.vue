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
import {
  formatReportDate,
  formatReportDateTime,
  localDateString,
  parsePositiveReportId,
  validateOptionalReportPeriod,
  validateReportPeriod,
  type ReportListItem,
} from '@/features/teacher/report'
import type {
  StudentRequestStatus,
  StudentTrainingHistoryDateRange,
  StudentTrainingHistoryItem,
} from '@/features/teacher/student'
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
  listError,
  listUiError,
  detailError,
  detailUiError,
  createError,
  memoError,
  duplicateReportId,
  memoDirty,
} = storeToRefs(reportStore)
const { detailsById, navigationItemsById, detailStatusById, detailErrorById } =
  storeToRefs(studentStore)
const { teacher } = storeToRefs(sessionStore)

const reportFromDraft = ref('')
const reportToDraft = ref('')
const reportFromFilter = ref('')
const reportToFilter = ref('')
const REPORTS_PER_PAGE = 6
const reportPage = ref(0)
const today = localDateString()
const completedTrainingsById = ref<Record<number, StudentTrainingHistoryItem>>({})
const reportHistoryStatus = ref<StudentRequestStatus>('idle')
const reportHistoryError = ref<string | null>(null)
const loadedHistoryRanges = new Set<string>()
const loadingHistoryRanges = new Map<string, Promise<void>>()
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
// 데모 치트로 학습일을 넘기면 아동의 학습 날짜가 실제 오늘보다 앞선다. 달력 기준
// 오늘로 상한을 두면 그날 학습 기록을 보고서에 담을 수 없어 치트와 어긋난다.
// 실제 학습이 있었던 마지막 날까지 고를 수 있게 한다.
const latestCompletedDate = computed(() => {
  const dates = Object.keys(completedDateCounts.value)
  return dates.length === 0 ? '' : dates.reduce((latest, date) => (date > latest ? date : latest), '')
})
const maxSelectableDate = computed(() =>
  latestCompletedDate.value > today ? latestCompletedDate.value : today,
)
const periodErrors = computed(() =>
  validateReportPeriod(startDate.value, endDate.value, maxSelectableDate.value),
)
const reportFilterErrors = computed(() =>
  validateOptionalReportPeriod(reportFromDraft.value, reportToDraft.value, maxSelectableDate.value),
)
const completedDateCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const training of Object.values(completedTrainingsById.value)) {
    const finishedDate = training.finishedAt?.slice(0, 10)
    if (!finishedDate) continue
    counts[finishedDate] = (counts[finishedDate] ?? 0) + 1
  }
  return counts
})
const selectedCompletedTrainings = computed(() =>
  Object.values(completedTrainingsById.value).filter((training) => {
    const finishedDate = training.finishedAt?.slice(0, 10)
    return Boolean(finishedDate && finishedDate >= startDate.value && finishedDate <= endDate.value)
  }),
)
const completedTrainingCount = computed(() => selectedCompletedTrainings.value.length)
const learningDayCount = computed(
  () =>
    new Set(
      selectedCompletedTrainings.value
        .map((training) => training.finishedAt?.slice(0, 10))
        .filter((date): date is string => Boolean(date)),
    ).size,
)
const filteredReports = computed(() => {
  if (!reportFromFilter.value && !reportToFilter.value) return reports.value
  return reports.value.filter((report) => {
    const beginsBeforeRangeEnds = !reportToFilter.value || report.startDate <= reportToFilter.value
    const endsAfterRangeBegins = !reportFromFilter.value || report.endDate >= reportFromFilter.value
    return beginsBeforeRangeEnds && endsAfterRangeBegins
  })
})
const totalReportPages = computed(() => Math.ceil(filteredReports.value.length / REPORTS_PER_PAGE))
const paginatedReports = computed(() => {
  const start = reportPage.value * REPORTS_PER_PAGE
  return filteredReports.value.slice(start, start + REPORTS_PER_PAGE)
})

watch([reportFromFilter, reportToFilter], () => {
  reportPage.value = 0
})

watch(totalReportPages, (total) => {
  reportPage.value = Math.min(reportPage.value, Math.max(0, total - 1))
})

watch(
  studentId,
  async (id) => {
    reportFromDraft.value = ''
    reportToDraft.value = ''
    reportFromFilter.value = ''
    reportToFilter.value = ''
    reportPage.value = 0
    completedTrainingsById.value = {}
    loadedHistoryRanges.clear()
    loadingHistoryRanges.clear()
    reportHistoryStatus.value = 'idle'
    reportHistoryError.value = null
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

function changeReportPage(page: number): void {
  if (page < 0 || page >= totalReportPages.value) return
  reportPage.value = page
}

function applyReportPeriodFilter(): void {
  if (reportFilterErrors.value.startDate || reportFilterErrors.value.endDate) return
  reportFromFilter.value = reportFromDraft.value
  reportToFilter.value = reportToDraft.value
}

function resetReportPeriodFilter(): void {
  reportFromDraft.value = ''
  reportToDraft.value = ''
  reportFromFilter.value = ''
  reportToFilter.value = ''
}

watch(
  [studentId, startDate, endDate],
  ([id, from, to]) => {
    if (id === null || !from || !to || from > to) return
    void loadCompletedTrainingRange({ from, to }, true)
  },
  { immediate: true },
)

function historyRangeKey(student: number, range: StudentTrainingHistoryDateRange): string {
  return `${student}:${range.from}:${range.to}`
}

async function loadCompletedTrainingRange(
  range: StudentTrainingHistoryDateRange,
  exposeStatus = false,
  force = false,
): Promise<void> {
  const requestedStudentId = studentId.value
  if (requestedStudentId === null) return
  const key = historyRangeKey(requestedStudentId, range)
  if (force) loadedHistoryRanges.delete(key)
  if (loadedHistoryRanges.has(key)) {
    if (exposeStatus) reportHistoryStatus.value = 'success'
    return
  }
  const inFlight = loadingHistoryRanges.get(key)
  if (inFlight) {
    await inFlight
    return
  }

  if (exposeStatus) {
    reportHistoryStatus.value = 'loading'
    reportHistoryError.value = null
  }
  const request = (async () => {
    const history = await studentStore.loadTrainingHistory(requestedStudentId, range)
    if (studentId.value !== requestedStudentId) return
    if (!history) {
      if (exposeStatus) {
        reportHistoryStatus.value = 'error'
        reportHistoryError.value = '완료 훈련일을 불러오지 못했습니다.'
      }
      return
    }
    completedTrainingsById.value = {
      ...completedTrainingsById.value,
      ...Object.fromEntries(
        history.learningHistory
          .filter((training) => training.finishedAt !== null)
          .map((training) => [training.trainingId, training]),
      ),
    }
    loadedHistoryRanges.add(key)
    if (exposeStatus) {
      reportHistoryStatus.value = 'success'
      reportHistoryError.value = null
    }
  })().finally(() => {
    loadingHistoryRanges.delete(key)
  })
  loadingHistoryRanges.set(key, request)
  await request
}

function loadVisibleHistoryRange(range: StudentTrainingHistoryDateRange): void {
  void loadCompletedTrainingRange(range)
}

function retrySelectedHistory(): void {
  if (studentId.value === null || !startDate.value || !endDate.value) return
  void loadCompletedTrainingRange({ from: startDate.value, to: endDate.value }, true, true)
}

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
            @update:teacher-memo-draft="reportStore.setTeacherMemoDraft"
            @back="reportStore.startNewReport()"
            @save-memo="reportStore.saveTeacherMemo()"
            @cancel-memo="reportStore.cancelTeacherMemo()"
          />
        </ReportPreview>
      </template>

      <div v-else class="report-start-workspace">
        <Card class="saved-reports" aria-labelledby="saved-reports-title">
          <CardHeader class="saved-reports__header">
            <div>
              <CardTitle id="saved-reports-title">저장된 보고서</CardTitle>
            </div>
          </CardHeader>
          <form class="saved-reports__filter" @submit.prevent="applyReportPeriodFilter">
            <label>
              <span>From</span>
              <input
                v-model="reportFromDraft"
                type="date"
                :max="maxSelectableDate"
                aria-label="보고서 기간 시작일"
                :aria-invalid="Boolean(reportFilterErrors.startDate)"
              />
            </label>
            <span aria-hidden="true">–</span>
            <label>
              <span>To</span>
              <input
                v-model="reportToDraft"
                type="date"
                :max="maxSelectableDate"
                aria-label="보고서 기간 종료일"
                :aria-invalid="Boolean(reportFilterErrors.endDate)"
              />
            </label>
            <Button
              size="sm"
              type="submit"
              :disabled="Boolean(reportFilterErrors.startDate || reportFilterErrors.endDate)"
              >조회</Button
            >
            <Button
              v-if="reportFromFilter || reportToFilter"
              size="sm"
              variant="ghost"
              type="button"
              @click="resetReportPeriodFilter"
            >
              초기화
            </Button>
            <p
              v-if="reportFilterErrors.startDate || reportFilterErrors.endDate"
              class="saved-reports__filter-error"
              role="alert"
            >
              {{ reportFilterErrors.startDate ?? reportFilterErrors.endDate }}
            </p>
          </form>
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
              <template v-else>
                <ul>
                  <li v-for="item in paginatedReports" :key="item.reportId">
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
                <nav class="saved-reports__pagination" aria-label="저장된 보고서 페이지">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    :disabled="reportPage === 0"
                    aria-label="이전 보고서 페이지"
                    @click="changeReportPage(reportPage - 1)"
                  >
                    이전
                  </Button>
                  <span aria-live="polite">{{ reportPage + 1 }} / {{ totalReportPages }}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    :disabled="reportPage + 1 >= totalReportPages"
                    aria-label="다음 보고서 페이지"
                    @click="changeReportPage(reportPage + 1)"
                  >
                    다음
                  </Button>
                </nav>
              </template>
            </template>
          </CardContent>
        </Card>

        <ReportSetupPanel
          v-model:start-date="startDate"
          v-model:end-date="endDate"
          :today="maxSelectableDate"
          :period-errors="periodErrors"
          :create-error="createError"
          :duplicate-report-id="duplicateReportId"
          :submitting="createStatus === 'submitting'"
          :completed-training-count="completedTrainingCount"
          :learning-day-count="learningDayCount"
          :completed-date-counts="completedDateCounts"
          :history-status="reportHistoryStatus"
          :history-error="reportHistoryError"
          @generate="generateReport"
          @open-duplicate="reportStore.openDuplicateReport()"
          @visible-range="loadVisibleHistoryRange"
          @retry-history="retrySelectedHistory"
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
  display: flex;
  align-items: end;
  gap: 6px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}
.saved-reports__filter label {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
}
.saved-reports__filter label > span {
  color: var(--muted-foreground);
  font-size: 10px;
  font-weight: 650;
}
.saved-reports__filter > span {
  padding-bottom: 9px;
  color: var(--muted-foreground);
}
.saved-reports__filter input {
  width: 100%;
  min-width: 0;
  height: 32px;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--background);
  color: var(--foreground);
  font: inherit;
  font-size: 10px;
}
.saved-reports__content {
  display: flex;
  flex-direction: column;
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
.saved-reports__pagination {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: auto;
  padding: 12px 4px 4px;
  border-top: 1px solid var(--border);
  background: var(--card);
}
.saved-reports__pagination span {
  min-width: 48px;
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 650;
  text-align: center;
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
