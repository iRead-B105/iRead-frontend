<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatStudentDateTime,
  type StudentAccuracyRecord,
  type StudentAccuracyRecords,
  type StudentReadingSpeedRecord,
  type StudentReadingSpeedRecords,
  type StudentRequestStatus,
} from '@/features/teacher/student'

type MetricTab = 'accuracy' | 'reading-speed'
type MetricRecord = StudentAccuracyRecord | StudentReadingSpeedRecord

const props = defineProps<{
  studentId: number
  selectedTrend: MetricTab
  accuracyRecords: StudentAccuracyRecords | null
  readingSpeedRecords: StudentReadingSpeedRecords | null
  status: StudentRequestStatus
  error: string | null
}>()

const emit = defineEmits<{
  retry: []
}>()

const selectedSourceId = ref<number | null>(null)
const records = computed<readonly MetricRecord[]>(() =>
  props.selectedTrend === 'accuracy'
    ? (props.accuracyRecords?.records ?? [])
    : (props.readingSpeedRecords?.records ?? []),
)
const selectedRecord = computed(
  () => records.value.find((record) => record.sourceId === selectedSourceId.value) ?? null,
)
const title = computed(() =>
  props.selectedTrend === 'accuracy' ? '읽기 정확도 기록' : '읽기 속도 기록',
)
const emptyLabel = computed(() =>
  props.selectedTrend === 'accuracy'
    ? '정확도 계산에 포함된 완료 훈련 기록이 없습니다.'
    : '읽기 속도 계산에 포함된 유효 음성 훈련 기록이 없습니다.',
)

watch(
  [() => props.selectedTrend, records],
  () => {
    selectedSourceId.value = records.value[0]?.sourceId ?? null
  },
  { immediate: true },
)

function isAccuracyRecord(record: MetricRecord): record is StudentAccuracyRecord {
  return 'accuracy' in record
}

function metricValue(record: MetricRecord): string {
  return isAccuracyRecord(record) ? `${record.accuracy}%` : `${record.speed} 단어/분`
}

function evidence(record: MetricRecord): string {
  if (isAccuracyRecord(record)) {
    return `정답 ${record.correctAttemptCount}개 / 유효 시도 ${record.attemptCount}개`
  }
  return `정답 단어 ${record.correctWordCount}개 / 유효 음성 ${formatDuration(record.measuredDurationMs)}`
}

function formatDuration(milliseconds: number): string {
  return `${Number((milliseconds / 1_000).toFixed(1))}초`
}

</script>

<template>
  <section class="metric-records" :aria-labelledby="`${selectedTrend}-records-title`">
    <header class="metric-records__heading">
      <div>
        <h3 :id="`${selectedTrend}-records-title`">{{ title }}</h3>
        <p>그래프 계산에 실제 포함된 원본 기록입니다.</p>
      </div>
      <Badge variant="secondary">{{ records.length }}건</Badge>
    </header>

    <div v-if="status === 'loading'" class="metric-records__state" aria-live="polite">
      {{ title }}을 불러오는 중입니다.
    </div>
    <div v-else-if="status === 'error'" class="metric-records__state is-error" role="alert">
      <strong>{{ title }}을 불러오지 못했습니다.</strong>
      <span>{{ error ?? '잠시 후 다시 시도해 주세요.' }}</span>
      <Button variant="outline" size="sm" type="button" @click="emit('retry')">
        다시 시도
      </Button>
    </div>
    <p v-else-if="records.length === 0" class="metric-records__state">
      {{ emptyLabel }}
    </p>

    <template v-else>
      <ol class="metric-record-list">
        <li v-for="record in records" :key="`${selectedTrend}:${record.sourceId}`">
          <button
            class="metric-record"
            :class="{ 'is-selected': selectedSourceId === record.sourceId }"
            type="button"
            :aria-pressed="selectedSourceId === record.sourceId"
            @click="selectedSourceId = record.sourceId"
          >
            <span>
              <small>{{ formatStudentDateTime(record.measuredAt) }}</small>
              <b>{{ record.trainingName }}</b>
            </span>
            <strong>{{ metricValue(record) }}</strong>
          </button>
        </li>
      </ol>

      <article v-if="selectedRecord" class="metric-record-detail" aria-live="polite">
        <dl>
          <div>
            <dt>기록 일시</dt>
            <dd>{{ formatStudentDateTime(selectedRecord.measuredAt) }}</dd>
          </div>
          <div>
            <dt>훈련명</dt>
            <dd>{{ selectedRecord.trainingName }}</dd>
          </div>
          <div>
            <dt>지표 값</dt>
            <dd>{{ metricValue(selectedRecord) }}</dd>
          </div>
          <div>
            <dt>측정 근거</dt>
            <dd>{{ evidence(selectedRecord) }}</dd>
          </div>
          <div>
            <dt>계산 기준</dt>
            <dd>{{ selectedRecord.unit }} · {{ selectedRecord.calculationVersion }}</dd>
          </div>
        </dl>
        <RouterLink
          class="metric-record-detail__link"
          :to="{
            name: 'student-training-history',
            params: { id: studentId },
            query: { trainingId: selectedRecord.sourceId },
          }"
        >
          상세 훈련 이력 보기
        </RouterLink>
      </article>
    </template>
  </section>
</template>

<style scoped>
.metric-records {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.metric-records__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.metric-records__heading h3,
.metric-records__heading p {
  margin: 0;
}

.metric-records__heading h3 {
  color: var(--slate-900);
  font-size: 14px;
}

.metric-records__heading p {
  margin-top: 3px;
  color: var(--slate-500);
  font-size: 11px;
}

.metric-records__state {
  display: grid;
  min-height: 88px;
  place-content: center;
  justify-items: center;
  gap: 7px;
  margin: 0;
  padding: 14px;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
  color: var(--slate-500);
  font-size: 12px;
  text-align: center;
}

.metric-records__state.is-error {
  background: #fff1f2;
  color: var(--danger-600);
}

.metric-record-list {
  display: grid;
  max-height: 190px;
  gap: 8px;
  margin: 0;
  padding: 0 3px 0 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  list-style: none;
  overflow-y: auto;
}

.metric-record {
  display: grid;
  width: 100%;
  min-height: 64px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: inherit;
  grid-template-columns: minmax(0, 1fr) auto;
  text-align: left;
}

.metric-record:hover,
.metric-record.is-selected {
  border-color: color-mix(in oklch, var(--primary-600) 38%, var(--border));
  background: var(--interactive-hover-background);
}

.metric-record span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.metric-record small {
  color: var(--slate-500);
  font-size: 10px;
}

.metric-record b,
.metric-record strong {
  color: var(--slate-800);
  font-size: 12px;
}

.metric-record-detail {
  display: grid;
  gap: 12px;
  padding: 13px;
  border: 1px solid color-mix(in oklch, var(--primary-600) 22%, var(--border));
  border-radius: var(--radius-md);
  background: color-mix(in oklch, var(--primary-50) 42%, var(--card));
}

.metric-record-detail dl {
  display: grid;
  margin: 0;
  gap: 10px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.metric-record-detail dl > div {
  display: grid;
  align-content: start;
  gap: 4px;
}

.metric-record-detail dt {
  color: var(--slate-500);
  font-size: 10px;
  font-weight: 600;
}

.metric-record-detail dd {
  margin: 0;
  color: var(--slate-800);
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.metric-record-detail__link {
  justify-self: end;
  color: var(--primary-700);
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}

.metric-record-detail__link:hover {
  text-decoration: underline;
}

@media (max-width: 720px) {
  .metric-record-detail dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .metric-record-list,
  .metric-record-detail dl {
    grid-template-columns: 1fr;
  }
}
</style>
