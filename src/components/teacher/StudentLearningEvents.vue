<script setup lang="ts">
import { ChevronDownIcon } from '@lucide/vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatStudentDateTime,
  studentLearningEventTypeLabels,
  type StudentLearningEvent,
  type StudentLearningEventDetail,
  type StudentLearningEventType,
  type StudentRequestStatus,
} from '@/features/teacher/student'

const attentionReasonLabels = {
  LOW_ACCURACY: '낮은 읽기 정확도',
  GAZE_ANALYSIS_FAILED: '시선 분석 실패',
  INACTIVE: '장기간 학습 없음',
  NO_HISTORY: '학습 기록 없음',
} as const

const props = withDefaults(
  defineProps<{
    events: readonly StudentLearningEvent[]
    selectedEventId?: number | null
    selectedEventType?: StudentLearningEventType | null
    detail?: StudentLearningEventDetail | null
    listStatus?: StudentRequestStatus
    listError?: string | null
    detailStatus?: StudentRequestStatus
    detailError?: string | null
  }>(),
  {
    selectedEventId: null,
    selectedEventType: null,
    detail: null,
    listStatus: 'idle',
    listError: null,
    detailStatus: 'idle',
    detailError: null,
  },
)

const emit = defineEmits<{
  select: [event: StudentLearningEvent]
  retryList: []
  retryDetail: [event: StudentLearningEvent]
  addToMemo: [event: StudentLearningEventDetail]
}>()

function isSelectedEvent(event: StudentLearningEvent): boolean {
  return props.selectedEventId === event.eventId && props.selectedEventType === event.eventType
}
</script>

<template>
  <section class="learning-events" aria-labelledby="recent-learning-title">
    <header class="learning-events__heading">
      <div>
        <h2 id="recent-learning-title">최근 학습 기록</h2>
        <p>기록을 선택하면 학습 결과와 확인할 내용, 다음 학습 제안을 한 번에 볼 수 있습니다.</p>
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
    <p v-else-if="events.length === 0" class="content-state">아직 표시할 학습 이벤트가 없습니다.</p>

    <ol v-else class="learning-event-list">
      <li
        v-for="event in events"
        :key="`${event.eventType}:${event.eventId}`"
        class="learning-event-item"
        :class="{ 'is-expanded': isSelectedEvent(event) }"
      >
        <button
          class="learning-event"
          :class="{ 'is-selected': isSelectedEvent(event) }"
          type="button"
          :aria-expanded="isSelectedEvent(event)"
          :aria-controls="`learning-event-detail-${event.eventType}-${event.eventId}`"
          @click="emit('select', event)"
        >
          <span class="learning-event__copy">
            <strong>{{ studentLearningEventTypeLabels[event.eventType] }}</strong>
            <small>{{ formatStudentDateTime(event.occurredAt) }}</small>
          </span>
          <span class="learning-event__result">
            <span>
              <Badge v-if="event.attentionRequired" variant="secondary">확인 필요</Badge>
              <b>{{ event.accuracy === null ? '정확도 없음' : `${event.accuracy}%` }}</b>
            </span>
            <ChevronDownIcon class="learning-event__chevron" aria-hidden="true" />
          </span>
        </button>
        <div
          v-if="isSelectedEvent(event)"
          :id="`learning-event-detail-${event.eventType}-${event.eventId}`"
          class="event-detail-shell"
          :aria-busy="detailStatus === 'loading' ? 'true' : undefined"
        >
          <div v-if="detailStatus === 'loading'" class="detail-placeholder" aria-live="polite">
            학습 이벤트 상세를 불러오는 중입니다.
          </div>

          <div
            v-else-if="detailStatus === 'error'"
            class="detail-placeholder is-error"
            role="alert"
          >
            <strong>학습 이벤트 상세를 불러오지 못했습니다.</strong>
            <span>{{ detailError ?? '잠시 후 다시 시도해 주세요.' }}</span>
            <Button variant="outline" size="sm" type="button" @click="emit('retryDetail', event)">
              상세 다시 시도
            </Button>
          </div>

          <Transition v-else name="event-detail-fade" appear>
            <article
              v-if="detail"
              :key="`${detail.eventType}:${detail.eventId}`"
              class="event-detail"
              aria-live="polite"
            >
              <header class="event-detail__heading">
                <div>
                  <span>최근 학습 한눈에 보기</span>
                  <h3>{{ studentLearningEventTypeLabels[detail.eventType] }} 결과</h3>
                  <p>학습 결과부터 교수자가 확인할 내용과 다음 학습 제안까지 모았습니다.</p>
                </div>
                <Badge v-if="detail.attentionRequired" variant="secondary">확인 필요</Badge>
              </header>

              <dl class="event-summary-grid">
                <div>
                  <dt>학습 종류</dt>
                  <dd>{{ studentLearningEventTypeLabels[detail.eventType] }}</dd>
                </div>
                <div>
                  <dt>기록 시각</dt>
                  <dd>{{ formatStudentDateTime(detail.occurredAt) }}</dd>
                </div>
                <div>
                  <dt>정확도</dt>
                  <dd>
                    {{ detail.accuracy === null ? '산정할 수 없음' : `${detail.accuracy}%` }}
                  </dd>
                </div>
                <div>
                  <dt>재시도</dt>
                  <dd>{{ detail.retryCount }}회</dd>
                </div>
              </dl>

              <div class="event-insight-grid">
                <section class="event-insight">
                  <span>학습 결과</span>
                  <h4>확인이 필요한 학습 구간</h4>
                  <div>
                    <ul v-if="detail.problemSegments.length" class="problem-segments">
                      <li v-for="segment in detail.problemSegments" :key="segment">
                        {{ segment }}
                      </li>
                    </ul>
                    <span v-else>확인된 문제 구간 없음</span>
                  </div>
                </section>
                <section class="event-insight">
                  <span>교수자 확인</span>
                  <h4>추가로 살펴볼 신호</h4>
                  <div>
                    <ul v-if="detail.attentionReasons.length" class="attention-reasons">
                      <li v-for="reason in detail.attentionReasons" :key="reason">
                        {{ attentionReasonLabels[reason] }}
                      </li>
                    </ul>
                    <span v-else>추가로 확인할 신호 없음</span>
                  </div>
                </section>
              </div>

              <section v-if="detail.recommendedTrainingTemplateId !== null" class="recommendation">
                <span>다음 학습 제안</span>
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
              <p v-else class="recommendation-empty">다음 학습으로 제안된 훈련이 없습니다.</p>

              <div class="event-detail__actions">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  @click="emit('addToMemo', detail)"
                >
                  내부 메모에 추가
                </Button>
              </div>
            </article>
          </Transition>
        </div>
      </li>
    </ol>
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
  font-size: 17px;
}

.learning-events__heading p {
  margin-top: 4px;
  color: var(--slate-500);
  font-size: 12px;
}

.learning-event-list {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.learning-event-item {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.learning-event-item.is-expanded {
  border-color: color-mix(in oklch, var(--primary-600) 32%, var(--border));
  box-shadow: 0 5px 16px rgb(15 23 42 / 5%);
}

.learning-event {
  display: grid;
  width: 100%;
  min-height: 66px;
  align-items: center;
  gap: 14px;
  padding: 11px 12px;
  border: 0;
  border-radius: 0;
  background: var(--card);
  color: inherit;
  grid-template-columns: minmax(0, 1fr) auto;
  text-align: left;
}

.learning-event:hover,
.learning-event.is-selected {
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
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.learning-event__result > span {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.learning-event__chevron {
  width: 16px;
  height: 16px;
  color: var(--slate-400);
  transition: transform 140ms ease;
}

.learning-event.is-selected .learning-event__chevron {
  transform: rotate(180deg);
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

.event-detail-shell {
  display: grid;
  min-height: 0;
  align-items: start;
  border-top: 1px solid var(--border);
  background: var(--slate-50);
}

.event-detail-shell .detail-placeholder {
  min-height: 180px;
  border: 0;
  border-radius: 0;
}

.event-detail {
  display: grid;
  gap: 16px;
  padding: 18px;
  background: var(--slate-50);
}

.event-detail__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.event-detail__heading span,
.recommendation > span {
  color: var(--slate-500);
  font-size: 11px;
}

.event-detail h3 {
  margin: 3px 0 0;
  font-size: 15px;
}

.event-detail__heading p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 12px;
  line-height: 1.5;
}

.event-summary-grid,
.recommendation dl {
  display: grid;
  margin: 0;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.event-summary-grid > div,
.recommendation dl > div {
  display: grid;
  gap: 4px;
}

.event-summary-grid dt,
.recommendation dt {
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 600;
}

.event-summary-grid dd,
.recommendation dd {
  margin: 0;
  color: var(--slate-700);
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.event-insight-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.event-insight {
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--card);
}

.event-insight > span {
  color: var(--primary-700);
  font-size: 11px;
  font-weight: 700;
}

.event-insight h4 {
  margin: 0;
  color: var(--slate-800);
  font-size: 13px;
}

.event-insight > div {
  color: var(--slate-600);
  font-size: 12px;
  line-height: 1.55;
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

.event-detail-fade-enter-active {
  transition: opacity 140ms ease;
}

.event-detail-fade-enter-from {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .event-detail-fade-enter-active,
  .learning-event-item,
  .learning-event__chevron {
    transition: none;
  }
}

@media (max-width: 620px) {
  .learning-event {
    grid-template-columns: 1fr;
  }

  .event-detail__heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .learning-event__result {
    justify-content: space-between;
  }

  .learning-event__result > span {
    justify-items: start;
  }

  .event-summary-grid,
  .event-insight-grid,
  .recommendation dl {
    grid-template-columns: 1fr;
  }

  .event-detail {
    padding: 16px;
  }
}
</style>
