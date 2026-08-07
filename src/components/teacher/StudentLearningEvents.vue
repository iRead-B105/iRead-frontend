<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  formatStudentDateTime,
  type StudentRequestStatus,
  type StudentTrainingHistoryItem,
} from '@/features/teacher/student'

withDefaults(
  defineProps<{
    history: readonly StudentTrainingHistoryItem[]
    listStatus?: StudentRequestStatus
    listError?: string | null
  }>(),
  {
    listStatus: 'idle',
    listError: null,
  },
)

const emit = defineEmits<{
  retryList: []
}>()

function accuracyLabel(item: StudentTrainingHistoryItem): string {
  return item.achievement === null ? '정확도 미측정' : `${item.achievement}%`
}

function learningDateTime(item: StudentTrainingHistoryItem): string {
  return formatStudentDateTime(item.finishedAt ?? item.startedAt ?? item.date)
}
</script>

<template>
  <section class="learning-events" aria-labelledby="recent-learning-title">
    <header class="learning-events__heading">
      <h2 id="recent-learning-title">최근 학습 기록</h2>
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
      최근 학습 이력을 불러오는 중입니다.
    </p>
    <div v-else-if="listStatus === 'error'" class="content-state is-error" role="alert">
      <strong>최근 학습 이력을 불러오지 못했습니다.</strong>
      <span>{{ listError ?? '잠시 후 다시 확인해 주세요.' }}</span>
    </div>
    <p v-else-if="history.length === 0" class="content-state">아직 표시할 학습 이력이 없습니다.</p>

    <ol v-else class="learning-event-list">
      <li
        v-for="item in history"
        :key="item.trainingId"
        class="learning-event-item"
      >
        <div class="learning-event">
          <span class="learning-event__copy">
            <strong>{{ item.learningType }}</strong>
            <small>{{ learningDateTime(item) }}</small>
          </span>
          <span class="learning-event__result">
            <b>{{ accuracyLabel(item) }}</b>
          </span>
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

.learning-events__heading h2 {
  margin: 0;
  font-size: 17px;
}

.learning-event-list {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.learning-event-item {
  overflow: hidden;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  background: var(--card, #ffffff);
}

.learning-event {
  display: grid;
  min-height: 66px;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  grid-template-columns: minmax(0, 1fr) auto;
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

.content-state {
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

.content-state.is-error {
  border-color: color-mix(in oklch, var(--danger-600) 30%, var(--border));
  background: #fff1f2;
  color: var(--danger-600);
}

.content-state span {
  display: block;
}

@media (max-width: 620px) {
  .learning-event {
    grid-template-columns: 1fr;
  }

  .learning-event__result {
    justify-items: start;
  }
}
</style>
