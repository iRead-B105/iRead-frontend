<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { EChartsOption } from 'echarts'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import LearningReportDocument from '@/components/teacher/LearningReportDocument.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import ReportActionPanel from '@/components/teacher/ReportActionPanel.vue'
import ReportPreview from '@/components/teacher/ReportPreview.vue'
import ReportSetupPanel from '@/components/teacher/ReportSetupPanel.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import { chartColors } from '@/features/teacher/chartTheme'
import { reportVersions, students } from '@/features/teacher/mockData'
import type { ReportStatus, ReportVersion } from '@/features/teacher/types'
import { reportApi } from '@/features/teacher/adminApi'

type ReportPageState = 'setting' | ReportStatus

const route = useRoute()
const currentStudent = computed(
  () => students.find((student) => student.id === Number(route.params.id)) ?? students[0]!,
)

const startDate = ref('2026-06-15')
const endDate = ref('2026-07-15')
const pageState = ref<ReportPageState>('setting')
const reportVersion = ref(Math.max(...reportVersions.map((report) => report.version)) + 1)
const publishedAt = ref<string>()
const busyAction = ref<string | null>(null)
const teacherOpinion = ref(
  '아동은 최근 4주 동안 읽기 정확도와 유창성에서 꾸준한 향상을 보였습니다. 다음 학습에서는 낯선 낱말의 의미를 문맥으로 추론하는 활동을 강화할 예정입니다.',
)
const selectedReportId = ref<number>()
const reportQuery = ref('')
const publishDialogOpen = ref(false)
const { visible: draftSaved, show: showDraftSaved } = useTemporaryNotice()

const reportStatus = computed<ReportStatus>(() =>
  pageState.value === 'setting' ? 'draft' : pageState.value,
)
const isEditable = computed(() => pageState.value === 'draft')
const storedReports = computed(() =>
  reportVersions.filter((report) => report.studentId === currentStudent.value.id),
)
const filteredStoredReports = computed(() => {
  const query = reportQuery.value.trim().toLowerCase()
  if (!query) return storedReports.value
  return storedReports.value.filter((report) => {
    const label = storedReportLabel(report).toLowerCase()
    const period = `${report.periodStart} ${report.periodEnd}`.toLowerCase()
    const status = report.status === 'draft' ? '초안' : '발행 완료'
    return label.includes(query) || period.includes(query) || status.includes(query)
  })
})
const reportVersionLabel = computed(() => {
  if (!publishedAt.value) return `초안-v${reportVersion.value}`
  return `${publishedAt.value.slice(0, 10)}-v${reportVersion.value}`
})
const dialogMessage = computed(() =>
  `${currentStudent.value.name} · ${startDate.value} ~ ${endDate.value}`,
)

const trendChart: EChartsOption = {
  animation: false,
  tooltip: { trigger: 'axis' },
  legend: { data: ['읽기 정확도', '읽기 유창성'], top: 5, textStyle: { fontSize: 10 } },
  grid: { left: 42, right: 18, top: 42, bottom: 30 },
  xAxis: { type: 'category', data: ['6/15', '6/20', '6/25', '6/30', '7/5', '7/10', '7/15'], axisLabel: { fontSize: 9 } },
  yAxis: { type: 'value', min: 20, max: 100, interval: 20, axisLabel: { formatter: '{value}', fontSize: 9 } },
  series: [
    { name: '읽기 정확도', type: 'line', symbol: 'circle', symbolSize: 7, data: [54, 60, 64, 68, 72, 78, 84], lineStyle: { width: 2.5, color: chartColors.blue }, itemStyle: { color: chartColors.white, borderColor: chartColors.blue, borderWidth: 2 } },
    { name: '읽기 유창성', type: 'line', symbol: 'circle', symbolSize: 7, data: [42, 49, 56, 61, 66, 70, 76], lineStyle: { width: 2.5, color: chartColors.green }, itemStyle: { color: chartColors.white, borderColor: chartColors.green, borderWidth: 2 } },
  ],
}

async function generateReport() {
  const response = await reportApi.create(
    currentStudent.value.id,
    startDate.value,
    endDate.value,
    teacherOpinion.value,
  )
  selectedReportId.value = response.reportId
  pageState.value = 'draft'
}

function resetPeriod() {
  selectedReportId.value = undefined
  pageState.value = 'setting'
}

function storedReportLabel(report: ReportVersion) {
  return `${(report.publishedAt ?? report.createdAt).slice(0, 10)}-v${report.version}`
}

function selectStoredReport(report: ReportVersion) {
  selectedReportId.value = report.id
  reportVersion.value = report.version
  startDate.value = report.periodStart
  endDate.value = report.periodEnd
  teacherOpinion.value = report.teacherOpinion
  publishedAt.value = report.publishedAt
  pageState.value = report.status
}

function startNewReport() {
  selectedReportId.value = undefined
  reportVersion.value = Math.max(...reportVersions.map((report) => report.version)) + 1
  publishedAt.value = undefined
  pageState.value = 'setting'
}

async function runAction(action: string, callback: () => void) {
  if (busyAction.value) return
  busyAction.value = action
  await new Promise((resolve) => window.setTimeout(resolve, 420))
  callback()
  busyAction.value = null
}

function saveDraft() {
  void runAction('save', showDraftSaved)
}

function requestPublish() {
  if (!teacherOpinion.value.trim()) return
  publishDialogOpen.value = true
}

function confirmDialogAction() {
  publishDialogOpen.value = false
  pageState.value = 'published'
  publishedAt.value = '2026-07-23 15:10'
}

function newDraft() {
  reportVersion.value += 1
  publishedAt.value = undefined
  pageState.value = 'draft'
}

function importInternalMemo() {
  const imported = '받침이 포함된 문장을 읽을 때 속도가 흔들리는 경향이 있어 반복 연습이 필요합니다.'
  teacherOpinion.value = `${teacherOpinion.value.trim()}\n\n${imported}`.trim()
}
</script>

<template>
  <div class="report page-stack">
    <PageHeader
      v-if="pageState === 'setting'"
      class="print-hidden"
      title="보고서"
      description="학습 기록을 정리해 학습 보고서를 만듭니다."
    />

    <div v-if="pageState === 'setting'" class="report-start-workspace print-hidden">
      <Card class="saved-reports" aria-labelledby="saved-reports-title">
        <CardHeader class="saved-reports__header">
          <div>
            <div class="saved-reports__title-row">
              <CardTitle id="saved-reports-title">저장된 보고서</CardTitle>
              <span>{{ storedReports.length }}개</span>
            </div>
            <CardDescription>발행일-버전 형식으로 저장된 보고서를 선택해 확인합니다.</CardDescription>
          </div>
          <CardAction>
            <Button variant="outline" size="sm" type="button" @click="startNewReport">
              새 보고서
            </Button>
          </CardAction>
        </CardHeader>
        <div class="saved-reports__filter">
          <Input
            v-model="reportQuery"
            type="search"
            aria-label="저장된 보고서 검색"
            placeholder="버전 또는 조회 기간 검색"
          />
        </div>
        <CardContent class="saved-reports__content">
          <ul v-if="filteredStoredReports.length">
            <li v-for="report in filteredStoredReports" :key="report.id">
              <Button
                variant="ghost"
                class="saved-report-row"
                type="button"
                @click="selectStoredReport(report)"
              >
                <span class="saved-report-row__copy">
                  <strong>{{ storedReportLabel(report) }}</strong>
                  <small>{{ report.periodStart }} ~ {{ report.periodEnd }}</small>
                </span>
                <Badge variant="secondary">
                  {{ report.status === 'draft' ? '초안' : '발행 완료' }}
                </Badge>
              </Button>
            </li>
          </ul>
          <p v-else class="saved-reports__empty">검색 조건에 맞는 보고서가 없습니다.</p>
        </CardContent>
      </Card>

      <ReportSetupPanel
        v-model:start-date="startDate"
        v-model:end-date="endDate"
        :student-name="currentStudent.name"
        @generate="generateReport"
      />
    </div>

    <ReportPreview v-else>
      <LearningReportDocument
        v-model:teacher-opinion="teacherOpinion"
        :student="currentStudent"
        :start-date="startDate"
        :end-date="endDate"
        :version-label="reportVersionLabel"
        :editable="isEditable"
        :internal-memo-available="true"
        :trend-chart="trendChart"
        @import-internal-memo="importInternalMemo"
      >
        <template #actions>
          <ReportActionPanel
            :status="reportStatus"
            :version-label="reportVersionLabel"
            :busy-action="busyAction"
            :saved="draftSaved"
            @reset-period="resetPeriod"
            @save-draft="saveDraft"
            @publish="requestPublish"
            @new-draft="newDraft"
          />
        </template>
      </LearningReportDocument>
    </ReportPreview>

    <ConfirmDialog
      :open="publishDialogOpen"
      title="보고서를 발행할까요?"
      :message="dialogMessage"
      confirm-label="보고서 발행"
      tone="primary"
      @cancel="publishDialogOpen = false"
      @confirm="confirmDialogAction"
    />
  </div>
</template>

<style scoped>
.report { width: 100%; container-type: inline-size; }
.report :deep(.report-preview) { padding-top: 4px; }
.report-start-workspace { display: grid; align-items: stretch; gap: 24px; grid-template-columns: 360px minmax(0, 1fr); }
.saved-reports {
  display: grid;
  height: 100%;
  max-height: 560px;
  gap: 0;
  overflow: hidden;
  padding: 0;
  border-radius: var(--radius-lg);
  background: var(--card);
  grid-template-rows: auto auto minmax(0, 1fr);
}
.saved-reports__header { align-items: start; gap: 16px; padding: 18px; border-bottom: 1px solid var(--border); grid-template-columns: minmax(0, 1fr) auto; }
.saved-reports__header :deep([data-slot='card-title']) { margin: 0; font-size: 16px; font-weight: 700; }
.saved-reports__header :deep([data-slot='card-description']) { max-width: 230px; margin-top: 4px; font-size: 11px; line-height: 1.55; }
.saved-reports__header :deep([data-slot='card-action']) { align-self: start; grid-column: 2; grid-row: 1 / span 2; }
.saved-reports__title-row { display: flex; align-items: center; gap: 8px; }
.saved-reports__title-row > span { color: var(--muted-foreground); font-size: 11px; font-weight: 600; }
.saved-reports__filter { padding: 12px 14px; border-bottom: 1px solid var(--border); }
.saved-reports__filter :deep(input) { height: 36px; font-size: 12px; }
.saved-reports__content { min-height: 0; overflow-y: auto; padding: 8px 10px 10px; scrollbar-gutter: stable; }
.saved-reports ul { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.saved-report-row { display: grid; width: 100%; min-height: 66px; justify-content: stretch; gap: 14px; padding: 12px; border-radius: var(--radius-sm); grid-template-columns: minmax(0, 1fr) auto; text-align: left; }
.saved-report-row:hover { background: var(--accent); }
.saved-report-row__copy { display: grid; min-width: 0; gap: 3px; }
.saved-report-row__copy strong { color: var(--foreground); font-size: 12px; font-weight: 700; }
.saved-report-row__copy small { overflow: hidden; color: var(--muted-foreground); font-size: 10px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.saved-report-row :deep([data-slot='badge']) { justify-self: end; white-space: nowrap; }
.saved-reports__empty { margin: 0; padding: 28px 10px; color: var(--muted-foreground); font-size: 12px; text-align: center; }
@container (max-width: 850px) {
  .report-start-workspace { grid-template-columns: 1fr; }
  .saved-reports { max-height: 420px; }
}
@media print { .report { display: block; } }
</style>
