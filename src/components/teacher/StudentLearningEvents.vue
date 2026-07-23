<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  learningEventStatusLabels,
  learningEventTypeLabels,
} from '@/features/teacher/displayLabels'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  AsyncContentState,
  LearningEvent,
  LearningRecord,
} from '@/features/teacher/types'

const props = withDefaults(
  defineProps<{
    records: LearningRecord[]
    events: LearningEvent[]
    state?: AsyncContentState
  }>(),
  { state: 'ready' },
)

const emit = defineEmits<{
  review: [eventId: number]
  addToNote: [eventId: number]
}>()

const selectedEventId = ref<number | null>(null)
const selectedEvent = computed(
  () => props.events.find((event) => event.id === selectedEventId.value) ?? null,
)

watch(
  () => props.records,
  () => {
    if (selectedEventId.value && !props.events.some((event) => event.id === selectedEventId.value)) {
      selectedEventId.value = null
    }
  },
)

function eventFor(record: LearningRecord) {
  return props.events.find((event) => event.id === record.eventId)
}

function selectRecord(record: LearningRecord) {
  selectedEventId.value = record.eventId ?? null
}

function formatDate(value: string) {
  const [date = '', time = ''] = value.split(' ')
  const [, month = '01', day = '01'] = date.split('-')
  return `${Number(month)}월 ${Number(day)}일 ${time}`
}
</script>

<template>
  <section class="learning-events" aria-labelledby="recent-learning-title">
    <header class="learning-events__heading">
      <div>
        <h2 id="recent-learning-title">최근 학습 기록</h2>
        <p>예외가 발생한 기록만 확인 상태를 표시합니다.</p>
      </div>
    </header>

    <p v-if="state === 'loading'" class="content-state" aria-live="polite">
      최근 학습 기록을 불러오는 중입니다.
    </p>
    <div v-else-if="state === 'error'" class="content-state is-error" role="alert">
      최근 학습 기록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.
    </div>
    <p v-else-if="records.length === 0" class="content-state">
      아직 표시할 최근 학습 기록이 없습니다.
    </p>

    <ol v-else class="learning-records">
      <li v-for="record in records" :key="record.id">
        <Button
          class="learning-record"
          :class="{ 'is-selected': selectedEventId === record.eventId }"
          variant="ghost"
          type="button"
          :disabled="!record.eventId"
          @click="selectRecord(record)"
        >
          <span>
            <strong>{{ record.activity }}</strong>
            <small>
              {{ formatDate(record.occurredAt) }} ·
              {{ record.result === 'completed' ? '종료' : '진행 중' }}
            </small>
          </span>
          <span class="learning-record__result">
            <Badge
              v-if="eventFor(record)?.status === 'needs-review'"
              variant="secondary"
              class="status-chip is-warning"
            >
              확인 필요
            </Badge>
            <b>{{ record.score === undefined ? '진행 중' : `${record.score}%` }}</b>
          </span>
        </Button>
      </li>
    </ol>

    <article v-if="selectedEvent" class="event-detail" aria-live="polite">
      <header>
        <div>
          <span>학습 이벤트 상세</span>
          <h3>{{ learningEventTypeLabels[selectedEvent.type] }}</h3>
        </div>
        <Badge variant="secondary" class="status-chip" :class="`is-${selectedEvent.status}`">
          {{ learningEventStatusLabels[selectedEvent.status] }}
        </Badge>
      </header>

      <dl>
        <div>
          <dt>발생 정보</dt>
          <dd>{{ formatDate(selectedEvent.occurredAt) }}</dd>
        </div>
        <div>
          <dt>이야기·장면</dt>
          <dd>{{ selectedEvent.storyTitle }} · {{ selectedEvent.sceneTitle }}</dd>
        </div>
        <div>
          <dt>재시도</dt>
          <dd>
            {{ selectedEvent.retryCount }}회 ·
            {{ selectedEvent.finalSucceeded ? '최종 성공' : '최종 미완료' }}
          </dd>
        </div>
        <div>
          <dt>후속 진행</dt>
          <dd>
            {{ selectedEvent.usedSafeFallback ? '기본 안전 분기 이동' : '기존 흐름 유지' }} ·
            {{ selectedEvent.learningOutcome === 'completed' ? '학습 완료' : '학습 이탈' }}
          </dd>
        </div>
        <div v-if="selectedEvent.issueSegment">
          <dt>문제 구간</dt>
          <dd>
            {{ selectedEvent.issueSegment }}
            <template v-if="selectedEvent.recognitionConfidence !== undefined">
              · 인식 신뢰도 {{ selectedEvent.recognitionConfidence }}%
            </template>
          </dd>
        </div>
        <div>
          <dt>시스템 대응</dt>
          <dd>{{ selectedEvent.systemResponse }}</dd>
        </div>
        <div v-if="selectedEvent.reviewedBy">
          <dt>확인 기록</dt>
          <dd>{{ selectedEvent.reviewedBy }} · {{ selectedEvent.reviewedAt }}</dd>
        </div>
      </dl>

      <p v-if="selectedEvent.type === 'safety-restriction'" class="event-detail__notice">
        안전 제한은 아동의 행동 평가가 아닌 시스템의 중립적인 보호 사건입니다.
      </p>

      <div class="event-detail__actions">
        <Button
          variant="outline"
          size="sm"
          type="button"
          @click="emit('addToNote', selectedEvent.id)"
        >
          내부 메모에 추가
        </Button>
        <Button
          size="sm"
          type="button"
          :disabled="selectedEvent.status === 'reviewed'"
          @click="emit('review', selectedEvent.id)"
        >
          {{ selectedEvent.status === 'reviewed' ? '확인 완료됨' : '확인 완료' }}
        </Button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.learning-events { display: grid; min-width: 0; gap: 14px; }
.learning-events__heading { display: flex; justify-content: space-between; gap: 16px; }
.learning-events__heading h2 { margin: 0; font-size: 17px; }
.learning-events__heading p { margin: 5px 0 0; color: var(--slate-500); font-size: 12px; }
.learning-records { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.learning-records li { min-width: 0; }
.learning-record { display: grid; width: 100%; min-height: 66px; align-items: center; gap: 14px; padding: 11px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--content-background); color: inherit; grid-template-columns: minmax(0, 1fr) 68px; text-align: left; }
.learning-record:not(:disabled):hover,
.learning-record.is-selected { border-color: color-mix(in oklch, var(--primary-600) 28%, var(--border)); background: var(--interactive-hover-background); }
.learning-record:disabled { cursor: default; }
.learning-record strong { display: -webkit-box; overflow: hidden; color: var(--slate-800); font-size: 13px; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.learning-record small { display: block; margin-top: 5px; color: var(--slate-500); font-size: 11px; line-height: 1.45; }
.learning-record__result { display: grid; min-width: 0; align-content: center; justify-items: end; gap: 6px; }
.learning-record__result b { color: var(--slate-800); font-size: 13px; font-weight: 700; }
.status-chip { display: inline-flex; width: max-content; align-items: center; padding: 3px 8px; border-radius: 999px; background: var(--slate-100); color: var(--slate-600); font-size: 10px; font-style: normal; font-weight: 700; }
.status-chip.is-warning,
.status-chip.is-needs-review,
.status-chip.is-follow-up-needed { background: #fff7ed; color: #b45309; }
.status-chip.is-reviewed { background: #f0fdf4; color: #15803d; }
.event-detail { margin-top: 14px; padding: 16px; border: 1px solid var(--slate-200); border-radius: var(--radius-sm); background: var(--slate-50); }
.event-detail header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.event-detail header span { color: var(--slate-500); font-size: 11px; }
.event-detail h3 { margin: 3px 0 0; font-size: 14px; }
.event-detail dl { display: grid; margin: 14px 0 0; gap: 10px; }
.event-detail dl > div { display: grid; gap: 3px; }
.event-detail dt { color: var(--slate-500); font-size: 11px; font-weight: 600; }
.event-detail dd { margin: 0; color: var(--slate-700); font-size: 12px; line-height: 1.5; }
.event-detail__notice { margin: 12px 0 0; color: var(--slate-600); font-size: 11px; line-height: 1.5; }
.event-detail__actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 14px; }
.content-state { margin: 14px 0 0; padding: 20px 8px; color: var(--slate-500); font-size: 12px; text-align: center; }
.content-state.is-error { background: #fff1f2; color: var(--danger-600); }
</style>
