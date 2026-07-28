<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatStudentDateTime,
  studentLearningEventTypeLabels,
  type StudentLearningEvent,
  type StudentLearningEventDetail,
  type StudentRequestStatus,
} from '@/features/teacher/student'

const attentionReasonLabels = {
  LOW_ACCURACY: '낮은 읽기 정확도',
  GAZE_ANALYSIS_FAILED: '시선 분석 실패',
  INACTIVE: '장기간 학습 없음',
  NO_HISTORY: '학습 기록 없음',
} as const

withDefaults(
  defineProps<{
    events: readonly StudentLearningEvent[]
    selectedEventId?: number | null
    detail?: StudentLearningEventDetail | null
    listStatus?: StudentRequestStatus
    listError?: string | null
    detailStatus?: StudentRequestStatus
    detailError?: string | null
  }>(),
  {
    selectedEventId: null,
    detail: null,
    listStatus: 'idle',
    listError: null,
    detailStatus: 'idle',
    detailError: null,
  },
)

const emit = defineEmits<{
  select: [eventId: number]
  retryList: []
  retryDetail: [eventId: number]
  addToMemo: [event: StudentLearningEventDetail]
}>()
</script>

<template>
  <section class="learning-events" aria-labelledby="recent-learning-title">
    <header class="learning-events__heading">
      <div>
        <h2 id="recent-learning-title">최근 학습 이벤트</h2>
        <p>Backend에서 제공한 최신 이벤트 3건입니다.</p>
      </div>
      <Button
        v-if="listStatus === 'error'"
        variant="outline"
        size="sm"
        type="button"
        @click="emit('retryList')"
      >
        다시 시도
      </Button>
    </header>

    <p v-if="listStatus === 'loading'" class="content-state" aria-live="polite">
      최근 학습 이벤트를 불러오는 중입니다.
    </p>
    <div v-else-if="listStatus === 'error'" class="content-state is-error" role="alert">
      <strong>최근 학습 이벤트를 불러오지 못했습니다.</strong>
      <span>{{ listError ?? '잠시 후 다시 확인해 주세요.' }}</span>
    </div>
    <p v-else-if="events.length === 0" class="content-state">
      아직 표시할 학습 이벤트가 없습니다.
    </p>

    <ol v-else class="learning-event-list">
      <li v-for="event in events" :key="event.eventId">
        <button
          class="learning-event"
          :class="{ 'is-selected': selectedEventId === event.eventId }"
          type="button"
          @click="emit('select', event.eventId)"
        >
          <span class="learning-event__copy">
            <strong>{{ studentLearningEventTypeLabels[event.eventType] }}</strong>
            <small>{{ formatStudentDateTime(event.occurredAt) }}</small>
          </span>
          <span class="learning-event__result">
            <Badge v-if="event.attentionRequired" variant="secondary">확인 필요</Badge>
            <b>{{ event.accuracy === null ? '정확도 없음' : `${event.accuracy}%` }}</b>
          </span>
        </button>
      </li>
    </ol>

    <p v-if="selectedEventId === null" class="detail-placeholder">
      이벤트를 선택하면 문제 구간과 Backend 권장 훈련을 확인할 수 있습니다.
    </p>

    <div
      v-else-if="detailStatus === 'loading'"
      class="detail-placeholder"
      aria-live="polite"
    >
      학습 이벤트 상세를 불러오는 중입니다.
    </div>

    <div v-else-if="detailStatus === 'error'" class="detail-placeholder is-error" role="alert">
      <strong>학습 이벤트 상세를 불러오지 못했습니다.</strong>
      <span>{{ detailError ?? '잠시 후 다시 시도해 주세요.' }}</span>
      <Button
        variant="outline"
        size="sm"
        type="button"
        @click="emit('retryDetail', selectedEventId)"
      >
        상세 다시 시도
      </Button>
    </div>

    <article v-else-if="detail" class="event-detail" aria-live="polite">
      <header>
        <div>
          <span>학습 이벤트 상세</span>
          <h3>{{ studentLearningEventTypeLabels[detail.eventType] }}</h3>
        </div>
        <Badge v-if="detail.attentionRequired" variant="secondary">확인 필요</Badge>
      </header>

      <dl>
        <div>
          <dt>발생 시각</dt>
          <dd>{{ formatStudentDateTime(detail.occurredAt) }}</dd>
        </div>
        <div>
          <dt>정확도</dt>
          <dd>{{ detail.accuracy === null ? '산정할 수 없음' : `${detail.accuracy}%` }}</dd>
        </div>
        <div>
          <dt>재시도</dt>
          <dd>{{ detail.retryCount }}회</dd>
        </div>
        <div>
          <dt>문제 구간</dt>
          <dd>
            <ul v-if="detail.problemSegments.length" class="problem-segments">
              <li v-for="segment in detail.problemSegments" :key="segment">{{ segment }}</li>
            </ul>
            <span v-else>확인된 문제 구간 없음</span>
          </dd>
        </div>
        <div>
          <dt>주의 사유</dt>
          <dd>
            <ul v-if="detail.attentionReasons.length" class="attention-reasons">
              <li v-for="reason in detail.attentionReasons" :key="reason">
                {{ attentionReasonLabels[reason] }}
              </li>
            </ul>
            <span v-else>공식 주의 사유 없음</span>
          </dd>
        </div>
      </dl>

      <section v-if="detail.recommendedTrainingTemplateId !== null" class="recommendation">
        <span>Backend 권장 훈련</span>
        <strong>{{ detail.recommendedCurriculumUnitName }}</strong>
        <p>{{ detail.recommendationReason }}</p>
        <dl>
          <div>
            <dt>권장 시간</dt>
            <dd>{{ detail.recommendedMinutes }}분</dd>
          </div>
          <div>
            <dt>권장 반복</dt>
            <dd>{{ detail.recommendedRepeatCount }}회</dd>
          </div>
        </dl>
      </section>
      <p v-else class="recommendation-empty">
        Backend에서 제공한 권장 훈련이 없습니다.
      </p>

      <div class="event-detail__actions">
        <Button variant="outline" size="sm" type="button" @click="emit('addToMemo', detail)">
          내부 메모에 추가
        </Button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.learning-events {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.learning-events__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.learning-events__heading h2,
.learning-events__heading p {
  margin: 0;
}

.learning-events__heading h2 {
  font-size: 18px;
}

.learning-events__heading p {
  margin-top: 4px;
  color: var(--slate-500);
  font-size: 12px;
}

.learning-event-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.learning-event {
  display: grid;
  width: 100%;
  min-height: 72px;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--card);
  color: inherit;
  grid-template-columns: minmax(0, 1fr) auto;
  text-align: left;
}

.learning-event:hover,
.learning-event.is-selected {
  border-color: color-mix(in oklch, var(--primary-600) 32%, var(--border));
  background: var(--interactive-hover-background);
}

.learning-event__copy,
.learning-event__result {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.learning-event__copy strong,
.learning-event__result b {
  color: var(--slate-800);
  font-size: 13px;
}

.learning-event__copy small {
  color: var(--slate-500);
  font-size: 11px;
}

.learning-event__result {
  justify-items: end;
}

.content-state,
.detail-placeholder {
  display: grid;
  min-height: 96px;
  place-content: center;
  justify-items: center;
  gap: 8px;
  margin: 0;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--slate-500);
  font-size: 12px;
  text-align: center;
}

.content-state.is-error,
.detail-placeholder.is-error {
  border-color: color-mix(in oklch, var(--danger-600) 30%, var(--border));
  background: #fff1f2;
  color: var(--danger-600);
}

.content-state span,
.detail-placeholder span {
  display: block;
}

.event-detail {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--slate-50);
}

.event-detail > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.event-detail header span,
.recommendation > span {
  color: var(--slate-500);
  font-size: 11px;
}

.event-detail h3 {
  margin: 3px 0 0;
  font-size: 15px;
}

.event-detail dl,
.recommendation dl {
  display: grid;
  margin: 0;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.event-detail dl > div,
.recommendation dl > div {
  display: grid;
  gap: 4px;
}

.event-detail dt,
.recommendation dt {
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 600;
}

.event-detail dd,
.recommendation dd {
  margin: 0;
  color: var(--slate-700);
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.problem-segments,
.attention-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 14px;
  margin: 0;
  padding-left: 16px;
}

.recommendation {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid color-mix(in oklch, var(--primary-600) 22%, var(--border));
  border-radius: var(--radius-md);
  background: var(--card);
}

.recommendation strong {
  color: var(--slate-900);
  font-size: 14px;
}

.recommendation p,
.recommendation-empty {
  margin: 0;
  color: var(--slate-600);
  font-size: 12px;
  line-height: 1.55;
}

.recommendation-empty {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--slate-100);
}

.event-detail__actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 620px) {
  .learning-event {
    grid-template-columns: 1fr;
  }

  .event-detail > header {
    align-items: flex-start;
    flex-direction: column;
  }

  .learning-event__result {
    justify-items: start;
  }

  .event-detail dl,
  .recommendation dl {
    grid-template-columns: 1fr;
  }

  .event-detail {
    padding: 16px;
  }
}
</style>
