<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { EChartsOption } from 'echarts'
import ChartPanel from '@/components/common/ChartPanel.vue'
import SaveToast from '@/components/common/SaveToast.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import StudentCommunicationPanel from '@/components/teacher/StudentCommunicationPanel.vue'
import StudentLearningEvents from '@/components/teacher/StudentLearningEvents.vue'
import { Card } from '@/components/ui/card'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import { chartColors } from '@/features/teacher/chartTheme'
import { learningEventTypeLabels } from '@/features/teacher/displayLabels'
import {
  learningEvents as initialLearningEvents,
  selectedStudent,
  students as mockStudents,
} from '@/features/teacher/mockData'
import type { AsyncContentState, LearningEvent, LearningRecord } from '@/features/teacher/types'
import {
  studentApi,
  trainingApi,
  type AccuracyTrend,
  type TrainingCatalog,
} from '@/features/teacher/adminApi'
import { useTeacherAdmin } from '@/features/teacher/useTeacherAdmin'

type CommunicationDraft = { note: string }
type CommunicationPanelExpose = { openTab: () => void }

const route = useRoute()
const { students: adminStudents, loadAdminData } = useTeacherAdmin()
const currentStudent = computed(
  () => adminStudents.find((student) => student.id === Number(route.params.id)) ?? selectedStudent,
)
const accuracyTrend = ref<AccuracyTrend[]>([])
const trainingCatalog = ref<TrainingCatalog[]>([])
const learningRecords = ref<LearningRecord[]>([])
const learningRecordsState = ref<AsyncContentState>('loading')
const referenceDate = new Date()
referenceDate.setHours(0, 0, 0, 0)
const eventItems = ref<LearningEvent[]>(initialLearningEvents.map((event) => ({ ...event })))
const draftsByStudent = reactive<Record<number, CommunicationDraft>>(
  Object.fromEntries(mockStudents.map((student) => [student.id, { note: '' }])),
)

onMounted(async () => {
  const studentId = Number(route.params.id)
  draftsByStudent[studentId] ??= { note: '' }
  learningRecordsState.value = 'loading'
  try {
    await loadAdminData()
    const [detail, trend, history, catalog] = await Promise.all([
      studentApi.get(studentId),
      studentApi.accuracyTrend(studentId),
      studentApi.trainingHistory(studentId),
      trainingApi.catalog(studentId),
    ])
    accuracyTrend.value = trend
    trainingCatalog.value = catalog
    learningRecords.value = history.slice(0, 3).map((item, index) => ({
      id: index + 1,
      studentId,
      occurredAt: (item.startedAt ?? `${item.date}T00:00:00`).replace('T', ' '),
      activity: item.learningType,
      result: item.finishedAt ? 'completed' : 'started',
      score: item.achievement == null ? undefined : Number(item.achievement),
    }))
    draftsByStudent[studentId]!.note = detail.teacherMemo ?? ''
    learningRecordsState.value = 'ready'
  } catch {
    learningRecordsState.value = 'error'
  }
})
const busyId = ref<number | null>(null)
const noticeMessage = ref('변경 사항이 반영되었습니다.')
const noticeKey = ref(0)
const { visible: noticeVisible, show: showNotice } = useTemporaryNotice()
const communicationSection = ref<HTMLElement | null>(null)
const communicationPanel = ref<CommunicationPanelExpose | null>(null)

const currentRecords = computed(() =>
  learningRecords.value.filter((record) => record.studentId === currentStudent.value.id),
)
const currentEvents = computed(() =>
  eventItems.value.filter((event) => event.studentId === currentStudent.value.id),
)
const reviewCount = computed(
  () => currentEvents.value.filter((event) => event.status !== 'reviewed').length,
)
const totalActionCount = computed(() => reviewCount.value)
const oldestActionLabel = computed(() => {
  const dates = [
    ...currentEvents.value
      .filter((event) => event.status !== 'reviewed')
      .map((event) => event.occurredAt),
  ].sort()
  const oldest = dates[0]
  if (!oldest) return ''
  const [date = ''] = oldest.split(' ')
  const [, month = '01', day = '01'] = date.split('-')
  return `가장 오래 대기한 항목은 ${Number(month)}월 ${Number(day)}일에 등록되었습니다.`
})

const currentDraft = computed(() => {
  const studentId = currentStudent.value.id
  draftsByStudent[studentId] ??= { note: '' }
  return draftsByStudent[studentId]
})
const noteDraft = computed({
  get: () => currentDraft.value.note,
  set: (value: string) => {
    currentDraft.value.note = value
  },
})

const recentLearningLabel = computed(() => {
  if (!currentStudent.value.lastLearningDate) return '-'
  const learningDate = new Date(`${currentStudent.value.lastLearningDate}T00:00:00`)
  const days = Math.max(
    0,
    Math.floor((referenceDate.getTime() - learningDate.getTime()) / 86_400_000),
  )
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
})

const nextTraining = computed(
  () =>
    trainingCatalog.value.find((training) => training.studentAchievement === null)?.trainingName
    ?? trainingCatalog.value[0]?.trainingName
    ?? '다음 훈련 확인 필요',
)
const accuracyChange = computed(() => {
  if (accuracyTrend.value.length < 2) return null
  return Number(accuracyTrend.value.at(-1)?.accuracy) - Number(accuracyTrend.value[0]?.accuracy)
})
const accuracyChangeLabel = computed(() => {
  if (accuracyChange.value === null) return '-'
  return `${accuracyChange.value > 0 ? '+' : ''}${accuracyChange.value}%p`
})
const accuracyAnalysis = computed(() => {
  if (accuracyChange.value === null) return '정확도 데이터가 더 쌓이면 변화 추이를 확인할 수 있습니다.'
  if (accuracyChange.value > 0) return `첫 학습 대비 읽기 정확도가 ${accuracyChange.value}%p 상승했습니다.`
  if (accuracyChange.value < 0) return `첫 학습 대비 읽기 정확도가 ${Math.abs(accuracyChange.value)}%p 하락했습니다.`
  return '첫 학습과 비교해 읽기 정확도가 동일하게 유지되고 있습니다.'
})
const formattedLastLearningDate = computed(() =>
  currentStudent.value.lastLearningDate.replaceAll('-', '.'),
)

function notify(message: string) {
  noticeMessage.value = message
  noticeKey.value += 1
  showNotice()
}

function reviewEvent(eventId: number) {
  eventItems.value = eventItems.value.map((event) =>
    event.id === eventId
      ? { ...event, status: 'reviewed', reviewedBy: '이OO 선생님', reviewedAt: '2026-07-21 14:20' }
      : event,
  )
  notify('학습 이벤트를 확인 완료로 변경했습니다.')
}

function addEventToNote(eventId: number) {
  const event = eventItems.value.find((item) => item.id === eventId)
  if (!event) return
  const prefix = noteDraft.value ? `${noteDraft.value}\n` : ''
  noteDraft.value = `${prefix}[${learningEventTypeLabels[event.type]}] ${event.storyTitle} · ${event.sceneTitle}: ${event.systemResponse}`
  communicationPanel.value?.openTab()
  communicationSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function saveNote(_noteId: number | null, text: string) {
  const studentId = currentStudent.value.id
  busyId.value = studentId
  try {
    await studentApi.updateTeacherMemo(studentId, text)
    noteDraft.value = text
    notify('교수자 내부 메모가 저장되었습니다.')
  } finally {
    busyId.value = null
  }
}

const levelChart = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis', valueFormatter: (value) => `${value}%` },
  grid: { left: 48, right: 24, top: 36, bottom: 34 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: accuracyTrend.value.map(({ date }) => date.slice(5).replace('-', '/')),
  },
  yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
  series: [
    {
      name: '읽기 정확도',
      type: 'line',
      smooth: false,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 5,
      data: accuracyTrend.value.map(({ accuracy }) => Number(accuracy)),
      lineStyle: { width: 2.5, color: chartColors.blue },
      itemStyle: {
        color: chartColors.blue,
        borderColor: chartColors.white,
        borderWidth: 2,
      },
      markLine: {
        silent: true,
        symbol: 'none',
        label: {
          color: chartColors.secondary,
          fontSize: 10,
          fontWeight: 600,
          formatter: '{b}',
          position: 'insideEndTop',
        },
        data: [
          {
            name: '목표 80%',
            yAxis: 80,
            lineStyle: { color: chartColors.amber, type: 'dashed', width: 1.5 },
          },
        ],
      },
      markPoint: {
        symbol: 'circle',
        symbolSize: 9,
        itemStyle: {
          color: chartColors.blue,
          borderColor: chartColors.white,
          borderWidth: 2,
        },
        label: {
          show: true,
          position: 'top',
          distance: 9,
          formatter: '{b}',
          color: chartColors.secondary,
          fontSize: 11,
          fontWeight: 600,
        },
        data: [
          { name: '훈련 변경', coord: ['6/27', 70] },
          { name: '교사 메모', coord: ['7/11', 71] },
        ],
      },
    },
  ],
}))
</script>

<template>
  <div class="overview page-stack">
    <PageHeader title="학습 현황" description="최근 학습 변화와 확인할 항목을 살펴봅니다." />
    <SaveToast
      :key="noticeKey"
      :visible="noticeVisible"
      :show-icon="false"
      :message="noticeMessage"
    />

    <Card class="student-facts" aria-label="아동 학습 상태 요약">
      <dl>
        <div>
          <dt>현재 단계</dt>
          <dd>
            <strong>{{ currentStudent.latestTraining }}</strong>
            <span>이해력 영역</span>
          </dd>
        </div>
        <div>
          <dt>최근 학습</dt>
          <dd>
            <strong>{{ recentLearningLabel }}</strong>
            <span>{{ formattedLastLearningDate }}</span>
          </dd>
        </div>
      </dl>
      <div v-if="false" class="action-summary" :class="{ 'is-complete': totalActionCount === 0 }">
        <div v-if="totalActionCount > 0">
          <strong>확인할 항목 {{ totalActionCount }}건</strong>
          <span>
            학습 이벤트 {{ reviewCount }}건
          </span>
          <small>{{ oldestActionLabel }}</small>
        </div>
        <div v-else>
          <strong>현재 확인할 항목이 없습니다.</strong>
          <span>학습 이벤트를 모두 확인했습니다.</span>
        </div>
      </div>
    </Card>

    <section class="learning-analysis">
      <Card class="trend-panel">
        <header class="section-heading">
          <div>
            <h2>읽기 정확도</h2>
            <p>훈련 변경과 메모 시점 표시</p>
          </div>
          <div class="trend-summary"><span>최근 변화</span><strong>{{ accuracyChangeLabel }}</strong></div>
        </header>
        <ChartPanel :option="levelChart" height="220px" aria-label="최근 6주 읽기 정확도 변화" />
        <div class="analysis-followup">
          <div>
            <span class="followup-label">변화 해석</span>
            <p>{{ accuracyAnalysis }}</p>
          </div>
          <div class="next-training">
            <span class="followup-label">다음 권장 훈련</span><strong>{{ nextTraining }}</strong>
            <p>읽기 속도보다 받침 정확도를 안정시키기 위해 15분씩 2회를 권장합니다.</p>
            <RouterLink :to="{ name: 'student-curriculum', params: { id: currentStudent.id } }"
              >커리큘럼에서 확인</RouterLink
            >
          </div>
        </div>
      </Card>

      <aside class="recent-panel">
        <StudentLearningEvents
          :records="currentRecords"
          :events="currentEvents"
          :state="learningRecordsState"
          @review="reviewEvent"
          @add-to-note="addEventToNote"
        />
        <RouterLink
          class="history-link"
          :to="{ name: 'student-training-history', params: { id: currentStudent.id } }"
        >
          전체 훈련 이력 보기
        </RouterLink>
      </aside>
    </section>

    <div ref="communicationSection">
      <StudentCommunicationPanel
        :key="currentStudent.id"
        ref="communicationPanel"
        v-model:note-draft="noteDraft"
        :busy-id="busyId"
        @save-note="saveNote"
      />
    </div>
  </div>
</template>

<style scoped>
.overview {
  gap: 20px;
  container-type: inline-size;
}
.overview > :deep(.save-toast) {
  position: fixed;
  z-index: 20;
  top: auto;
  right: 28px;
  bottom: 28px;
  width: max-content;
  max-width: min(360px, calc(100vw - 40px));
  min-height: 40px;
  padding: 9px 13px;
  font-size: 12px;
}
.student-facts {
  display: grid;
  align-items: stretch;
  gap: 0;
  padding: 16px 18px;
  border: 0;
  border-radius: var(--radius-lg);
  background: transparent;
  box-shadow: none;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.student-facts dl {
  display: contents;
  margin: 0;
  padding: 0;
}
.student-facts dl > div {
  display: grid;
  width: min(100%, 240px);
  min-width: 0;
  align-content: center;
  justify-self: center;
  gap: 4px;
  padding-right: 24px;
}
.student-facts dl > div + div {
  margin-left: 0;
  padding-left: 24px;
  border-left: 1px solid var(--slate-200);
}
.student-facts dt {
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.student-facts dd {
  display: grid;
  gap: 2px;
  margin: 0;
}
.student-facts dd strong {
  color: var(--slate-900);
  font-size: 15px;
  font-weight: 750;
  line-height: 1.35;
}
.student-facts dd span {
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 500;
}
.action-summary {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  padding-left: 24px;
  border-left: 1px solid var(--slate-200);
}
.action-summary > div {
  display: grid;
  gap: 2px;
}
.action-summary strong {
  color: var(--slate-900);
  font-size: 13px;
}
.action-summary span {
  color: var(--slate-600);
  font-size: 11px;
}
.action-summary small {
  color: #b45309;
  font-size: 10px;
}
.action-summary.is-complete strong {
  color: var(--success-600);
}
.learning-analysis {
  display: grid;
  align-items: stretch;
  gap: 24px;
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.75fr);
}
.trend-panel {
  min-width: 0;
  gap: 0;
  padding: 20px;
  border-radius: var(--radius-lg);
}
.recent-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow-card);
  scroll-margin-top: 90px;
}
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.section-heading h2 {
  margin: 0;
  font-size: 17px;
}
.section-heading p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}
.trend-summary {
  display: grid;
  flex: 0 0 auto;
  gap: 2px;
  text-align: right;
}
.trend-summary span {
  color: var(--slate-500);
  font-size: 12px;
}
.trend-summary strong {
  color: var(--slate-900);
  font-size: 20px;
  line-height: 1.2;
}
.trend-panel :deep(.chart-panel) {
  padding-top: 2px;
}
.analysis-followup {
  display: grid;
  gap: 24px;
  margin-top: 4px;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
}
.analysis-followup > div {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in oklch, var(--muted) 28%, transparent);
}
.followup-label {
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 600;
}
.analysis-followup p {
  margin: 4px 0 0;
  color: var(--slate-600);
  font-size: 12px;
  line-height: 1.5;
}
.next-training strong {
  display: block;
  margin-top: 5px;
  color: var(--slate-900);
  font-size: 14px;
  line-height: 1.45;
}
.next-training a,
.history-link {
  display: inline-flex;
  margin-top: 8px;
  color: var(--primary-700);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}
.history-link {
  width: 100%;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.next-training a:hover,
.history-link:hover {
  text-decoration: underline;
}
.overview > div:last-child {
  scroll-margin-top: 90px;
}

@container (max-width: 940px) {
  .learning-analysis {
    grid-template-columns: 1fr;
  }
  .trend-panel {
    padding-right: 0;
  }
  .recent-panel {
    padding: 20px;
  }
}
</style>
