<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertCircle, BookOpen, Clock3, UserRound } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/teacher/PageHeader.vue'
import StudentCommunicationPanel from '@/components/teacher/StudentCommunicationPanel.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import {
  formatStudentDateTime,
  normalizeTeacherMemo,
  validateTeacherMemo,
  type StudentAttentionReason,
} from '@/features/teacher/student'
import { isApiError } from '@/lib/api'
import { useStudentStore } from '@/stores/students'

const attentionReasonLabels: Readonly<Record<StudentAttentionReason, string>> = {
  LOW_ACCURACY: '최근 읽기 정확도 확인 필요',
  GAZE_ANALYSIS_FAILED: '최근 시선 분석 확인 필요',
  INACTIVE: '장기간 학습 기록 없음',
  NO_HISTORY: '아직 학습 기록 없음',
}

const route = useRoute()
const router = useRouter()
const studentStore = useStudentStore()
const studentId = computed(() => Number(route.params.id))
const validStudentId = computed(
  () => Number.isInteger(studentId.value) && studentId.value > 0,
)
const detail = computed(() => studentStore.detailsById[studentId.value])
const learningSummary = computed(
  () => studentStore.learningSummaryById[studentId.value],
)
const detailStatus = computed(
  () => studentStore.detailStatusById[studentId.value] ?? 'idle',
)
const detailErrorStatus = computed(
  () => studentStore.detailErrorStatusById[studentId.value] ?? null,
)
const learningSummaryStatus = computed(
  () => studentStore.learningSummaryStatusById[studentId.value] ?? 'idle',
)
const learningSummaryError = computed(
  () => studentStore.learningSummaryErrorById[studentId.value],
)
const hasNoHistory = computed(
  () => learningSummary.value?.attentionReasons.includes('NO_HISTORY') ?? false,
)
const visibleAttentionReasons = computed(
  () =>
    learningSummary.value?.attentionReasons.filter((reason) => reason !== 'NO_HISTORY') ?? [],
)

const noteDraft = ref('')
const memoSaving = ref(false)
const memoError = ref('')
const { visible: memoSaved, show: showMemoSaved } = useTemporaryNotice()

const detailErrorCopy = computed(() => {
  if (!validStudentId.value) {
    return {
      title: '올바르지 않은 아동 주소입니다.',
      description: '아동 목록에서 다시 선택해 주세요.',
    }
  }
  if (detailErrorStatus.value === 403) {
    return {
      title: '이 아동을 조회할 권한이 없습니다.',
      description: '담당 아동인지 확인하거나 관리자에게 문의해 주세요.',
    }
  }
  if (detailErrorStatus.value === 404) {
    return {
      title: '아동을 찾을 수 없습니다.',
      description: '삭제되었거나 더 이상 담당하지 않는 아동일 수 있습니다.',
    }
  }
  return {
    title: '아동 정보를 불러오지 못했습니다.',
    description:
      studentStore.detailErrorById[studentId.value] ??
      '연결 상태를 확인한 뒤 다시 시도해 주세요.',
  }
})

function memoErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 403) return '이 메모를 저장할 권한이 없습니다.'
    if (error.status === 404) return '아동을 찾을 수 없어 메모를 저장하지 못했습니다.'
    if (error.status === 409) return '다른 변경 사항과 충돌했습니다. 다시 시도해 주세요.'
    if (error.status >= 500 || error.status === 0) {
      return '서버 문제로 메모를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    }
    return error.message
  }
  return error instanceof Error ? error.message : '메모를 저장하지 못했습니다.'
}

async function loadOverview(nextStudentId: number): Promise<void> {
  noteDraft.value = ''
  memoError.value = ''
  if (!Number.isInteger(nextStudentId) || nextStudentId <= 0) return

  await Promise.all([
    studentStore.loadDetail(nextStudentId),
    studentStore.loadLearningSummary(nextStudentId),
  ])
  if (studentId.value !== nextStudentId) return
  noteDraft.value = studentStore.detailsById[nextStudentId]?.teacherMemo ?? ''
}

async function retryDetail(): Promise<void> {
  if (!validStudentId.value) return
  await studentStore.loadDetail(studentId.value)
  noteDraft.value = studentStore.detailsById[studentId.value]?.teacherMemo ?? noteDraft.value
}

async function saveMemo(value: string): Promise<void> {
  const validationError = validateTeacherMemo(value)
  if (validationError || !detail.value) {
    memoError.value = validationError ?? '아동 정보를 불러온 뒤 다시 시도해 주세요.'
    return
  }

  memoSaving.value = true
  memoError.value = ''
  const normalizedMemo = normalizeTeacherMemo(value)
  try {
    await studentStore.saveTeacherMemo(detail.value.studentId, normalizedMemo)
    noteDraft.value = normalizedMemo ?? ''
    showMemoSaved()
  } catch (error) {
    memoError.value = memoErrorMessage(error)
  } finally {
    memoSaving.value = false
  }
}

watch(studentId, loadOverview, { immediate: true })
</script>

<template>
  <div class="overview page-stack">
    <template v-if="!validStudentId || (detailStatus === 'error' && !detail)">
      <PageHeader title="학습 현황" description="담당 아동의 학습 상태를 확인합니다." />
      <section class="overview-state" role="alert">
        <AlertCircle :size="32" aria-hidden="true" />
        <h2>{{ detailErrorCopy.title }}</h2>
        <p>{{ detailErrorCopy.description }}</p>
        <div>
          <Button
            v-if="validStudentId && detailErrorStatus !== 404"
            variant="outline"
            type="button"
            @click="retryDetail"
          >
            다시 시도
          </Button>
          <Button type="button" @click="router.push({ name: 'teacher-students' })">
            아동 목록으로 이동
          </Button>
        </div>
      </section>
    </template>

    <template v-else-if="!detail">
      <PageHeader title="학습 현황" description="아동 정보를 불러오는 중입니다." />
      <section class="overview-state" aria-live="polite">
        <span class="overview-state__spinner" aria-hidden="true" />
        <h2>아동 정보를 불러오고 있습니다.</h2>
      </section>
    </template>

    <template v-else>
      <PageHeader
        :title="`${detail.name} 학습 현황`"
        description="현재 학습 단계와 교수자 확인 항목을 살펴봅니다."
      >
        <template #actions>
          <Button
            variant="outline"
            type="button"
            @click="
              router.push({
                name: 'student-edit',
                params: { id: detail.studentId },
              })
            "
          >
            아동 정보 수정
          </Button>
        </template>
      </PageHeader>

      <Card class="student-profile-card">
        <div class="student-profile-card__avatar">
          <img
            v-if="detail.imageUrl"
            :src="detail.imageUrl"
            :alt="`${detail.name} 프로필`"
          />
          <span v-else aria-hidden="true">{{ detail.name.charAt(0) }}</span>
        </div>
        <div class="student-profile-card__identity">
          <strong>{{ detail.name }}</strong>
          <span>{{ detail.school }}</span>
        </div>
        <dl>
          <div>
            <dt>생년월일</dt>
            <dd>{{ detail.birthday }}</dd>
          </div>
          <div>
            <dt>성별</dt>
            <dd>{{ detail.gender === 'Boy' ? '남자' : '여자' }}</dd>
          </div>
          <div>
            <dt>보호자</dt>
            <dd>{{ detail.guardian }}</dd>
          </div>
          <div>
            <dt>보호자 연락처</dt>
            <dd>{{ detail.guardianContact }}</dd>
          </div>
        </dl>
      </Card>

      <section class="learning-summary-section" aria-labelledby="learning-summary-title">
        <header>
          <div>
            <h2 id="learning-summary-title">학습 상태 요약</h2>
            <p>Backend에서 집계한 현재 단계와 공식 확인 신호입니다.</p>
          </div>
          <Button
            v-if="learningSummaryStatus === 'error'"
            variant="outline"
            size="sm"
            type="button"
            @click="studentStore.loadLearningSummary(detail.studentId)"
          >
            다시 시도
          </Button>
        </header>

        <Alert v-if="learningSummaryStatus === 'error'" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>학습 상태를 불러오지 못했습니다.</AlertTitle>
          <AlertDescription>
            {{ learningSummaryError ?? '잠시 후 다시 시도해 주세요.' }}
          </AlertDescription>
        </Alert>

        <div
          v-else-if="learningSummaryStatus === 'loading' || !learningSummary"
          class="summary-loading"
          aria-live="polite"
        >
          학습 상태를 불러오는 중입니다.
        </div>

        <div v-else class="summary-grid">
          <Card class="summary-card">
            <BookOpen :size="20" aria-hidden="true" />
            <span>현재 단계</span>
            <strong>{{ learningSummary.currentStage ?? '단계 정보 없음' }}</strong>
          </Card>
          <Card class="summary-card">
            <Clock3 :size="20" aria-hidden="true" />
            <span>최근 학습</span>
            <strong>{{ formatStudentDateTime(learningSummary.lastLearningAt) }}</strong>
          </Card>
          <Card
            class="summary-card summary-card--attention"
            :class="{ 'is-clear': learningSummary.attentionRequiredCount === 0 }"
          >
            <UserRound :size="20" aria-hidden="true" />
            <span>교수자 확인 신호</span>
            <strong>{{ learningSummary.attentionRequiredCount }}건</strong>
          </Card>
        </div>

        <div v-if="learningSummary" class="attention-state">
          <p v-if="hasNoHistory" class="attention-state__empty">
            아직 학습 기록이 없습니다. 첫 학습이 완료되면 상태 요약이 표시됩니다.
          </p>
          <template v-else-if="visibleAttentionReasons.length">
            <strong>확인이 필요한 사유</strong>
            <ul>
              <li v-for="reason in visibleAttentionReasons" :key="reason">
                <Badge variant="secondary">{{ attentionReasonLabels[reason] }}</Badge>
              </li>
            </ul>
          </template>
          <p v-else class="attention-state__clear">
            현재 확인이 필요한 공식 학습 신호가 없습니다.
          </p>
        </div>
      </section>

      <StudentCommunicationPanel
        v-model:note-draft="noteDraft"
        :saved-value="detail.teacherMemo"
        :busy="memoSaving"
        :error="memoError"
        :saved="memoSaved"
        @save-note="saveMemo"
      />
    </template>
  </div>
</template>

<style scoped>
.overview {
  max-width: 1120px;
  margin: 0 auto;
  gap: 20px;
}

.overview-state {
  display: grid;
  min-height: 320px;
  place-content: center;
  justify-items: center;
  gap: 10px;
  padding: 32px;
  color: var(--slate-500);
  text-align: center;
}

.overview-state h2,
.overview-state p {
  margin: 0;
}

.overview-state h2 {
  color: var(--slate-800);
  font-size: 18px;
}

.overview-state p {
  max-width: 460px;
  font-size: 13px;
}

.overview-state > div {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.overview-state__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--slate-200);
  border-top-color: var(--primary-600);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.student-profile-card {
  display: grid;
  align-items: center;
  gap: 18px;
  padding: 20px 22px;
  grid-template-columns: 64px minmax(150px, 0.7fr) minmax(0, 2fr);
}

.student-profile-card__avatar img,
.student-profile-card__avatar span {
  display: grid;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
  place-items: center;
}

.student-profile-card__avatar span {
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 20px;
  font-weight: 800;
}

.student-profile-card__identity {
  display: grid;
  gap: 4px;
}

.student-profile-card__identity strong {
  color: var(--slate-900);
  font-size: 18px;
}

.student-profile-card__identity span,
.learning-summary-section header p {
  color: var(--slate-500);
  font-size: 12px;
}

.student-profile-card dl {
  display: grid;
  margin: 0;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.student-profile-card dl > div {
  display: grid;
  gap: 3px;
}

.student-profile-card dt {
  color: var(--slate-500);
  font-size: 11px;
}

.student-profile-card dd {
  margin: 0;
  color: var(--slate-800);
  font-size: 13px;
  font-weight: 650;
}

.learning-summary-section {
  display: grid;
  gap: 14px;
}

.learning-summary-section > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.learning-summary-section header h2,
.learning-summary-section header p {
  margin: 0;
}

.learning-summary-section header h2 {
  font-size: 18px;
}

.learning-summary-section header p {
  margin-top: 4px;
}

.summary-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.summary-card {
  display: grid;
  min-height: 132px;
  align-content: center;
  gap: 6px;
  padding: 18px;
}

.summary-card > svg {
  margin-bottom: 5px;
  color: var(--primary-600);
}

.summary-card span {
  color: var(--slate-500);
  font-size: 12px;
}

.summary-card strong {
  color: var(--slate-900);
  font-size: 15px;
  line-height: 1.45;
}

.summary-card--attention > svg,
.summary-card--attention strong {
  color: var(--warning-700, #b45309);
}

.summary-card--attention.is-clear > svg,
.summary-card--attention.is-clear strong {
  color: var(--success-600);
}

.summary-loading,
.attention-state {
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--slate-500);
  font-size: 13px;
}

.attention-state {
  display: grid;
  gap: 9px;
}

.attention-state p,
.attention-state strong {
  margin: 0;
  font-size: 12px;
}

.attention-state ul {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.attention-state__empty {
  color: var(--slate-600);
}

.attention-state__clear {
  color: var(--success-700, #15803d);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 820px) {
  .student-profile-card {
    grid-template-columns: 58px 1fr;
  }

  .student-profile-card dl {
    grid-column: 1 / -1;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .student-profile-card dl {
    grid-template-columns: 1fr;
  }
}
</style>
