<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import type { StudentRequestStatus } from '@/features/teacher/student'

interface CalendarDay {
  readonly date: string
  readonly day: number
  readonly inVisibleMonth: boolean
  readonly disabled: boolean
}

const props = withDefaults(
  defineProps<{
    startDate: string
    endDate: string
    today: string
    completedDateCounts?: Readonly<Record<string, number>>
    historyStatus?: StudentRequestStatus
    historyError?: string | null
    disabled?: boolean
  }>(),
  {
    completedDateCounts: () => ({}),
    historyStatus: 'idle',
    historyError: null,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:startDate': [value: string]
  'update:endDate': [value: string]
  visibleRange: [range: { from: string; to: string }]
  retry: []
}>()

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12)
}

function formatLocalDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1, 12)
}

function monthEnd(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0, 12)
}

function addMonths(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1, 12)
}

const visibleMonth = ref(monthStart(parseLocalDate(props.endDate || props.today)))
const selectingEnd = ref(false)
const todayMonth = computed(() => monthStart(parseLocalDate(props.today)))
const visibleMonthLabel = computed(() =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(visibleMonth.value),
)
const canMoveNext = computed(() => addMonths(visibleMonth.value, 1) <= todayMonth.value)
const calendarDays = computed<readonly CalendarDay[]>(() => {
  const firstDay = monthStart(visibleMonth.value)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const formatted = formatLocalDate(date)
    return {
      date: formatted,
      day: date.getDate(),
      inVisibleMonth: date.getMonth() === visibleMonth.value.getMonth(),
      disabled: formatted > props.today,
    }
  })
})

watch(
  () => props.endDate,
  (endDate) => {
    if (!endDate) return
    const nextMonth = monthStart(parseLocalDate(endDate))
    if (
      nextMonth.getFullYear() !== visibleMonth.value.getFullYear() ||
      nextMonth.getMonth() !== visibleMonth.value.getMonth()
    ) {
      visibleMonth.value = nextMonth
    }
  },
)

watch(
  visibleMonth,
  (month) => {
    emit('visibleRange', {
      from: formatLocalDate(monthStart(month)),
      to: formatLocalDate(monthEnd(month)),
    })
  },
  { immediate: true },
)

function moveMonth(amount: number): void {
  const next = addMonths(visibleMonth.value, amount)
  if (amount > 0 && next > todayMonth.value) return
  visibleMonth.value = next
}

function selectDate(date: string): void {
  if (props.disabled || date > props.today) return
  if (!selectingEnd.value) {
    emit('update:startDate', date)
    emit('update:endDate', date)
    selectingEnd.value = true
    return
  }

  if (date < props.startDate) {
    emit('update:endDate', props.startDate)
    emit('update:startDate', date)
  } else {
    emit('update:endDate', date)
  }
  selectingEnd.value = false
}

function isSelected(date: string): boolean {
  return date === props.startDate || date === props.endDate
}

function isInRange(date: string): boolean {
  return Boolean(props.startDate && props.endDate && date > props.startDate && date < props.endDate)
}
</script>

<template>
  <div class="report-calendar" aria-label="보고서 기간 선택 달력">
    <header class="report-calendar__header">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        aria-label="이전 달"
        :disabled="disabled"
        @click="moveMonth(-1)"
      >
        ‹
      </Button>
      <strong>{{ visibleMonthLabel }}</strong>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        aria-label="다음 달"
        :disabled="disabled || !canMoveNext"
        @click="moveMonth(1)"
      >
        ›
      </Button>
    </header>

    <div class="report-calendar__weekdays" aria-hidden="true">
      <span v-for="weekday in ['월', '화', '수', '목', '금', '토', '일']" :key="weekday">
        {{ weekday }}
      </span>
    </div>

    <div class="report-calendar__grid">
      <button
        v-for="day in calendarDays"
        :key="day.date"
        class="report-calendar__day"
        :class="{
          'is-outside': !day.inVisibleMonth,
          'is-selected': isSelected(day.date),
          'is-in-range': isInRange(day.date),
          'has-training': (completedDateCounts[day.date] ?? 0) > 0,
        }"
        type="button"
        :disabled="disabled || day.disabled"
        :aria-pressed="isSelected(day.date)"
        :aria-label="`${day.date}${completedDateCounts[day.date] ? `, 완료 훈련 ${completedDateCounts[day.date]}개` : ''}`"
        @click="selectDate(day.date)"
      >
        <span>{{ day.day }}</span>
        <b v-if="completedDateCounts[day.date]" aria-hidden="true">
          {{ completedDateCounts[day.date] }}
        </b>
      </button>
    </div>

    <p class="report-calendar__guide">
      {{ selectingEnd ? '종료일을 선택해 주세요.' : '시작일을 선택한 뒤 종료일을 선택해 주세요.' }}
    </p>
    <p v-if="historyStatus === 'loading'" class="report-calendar__status" role="status">
      완료 훈련일을 불러오는 중입니다.
    </p>
    <div v-else-if="historyStatus === 'error'" class="report-calendar__status is-error" role="alert">
      <span>{{ historyError ?? '완료 훈련일을 불러오지 못했습니다.' }}</span>
      <Button variant="outline" size="sm" type="button" @click="emit('retry')">
        다시 불러오기
      </Button>
    </div>
  </div>
</template>

<style scoped>
.report-calendar {
  display: grid;
  width: 100%;
  gap: 12px;
}

.report-calendar__header {
  display: grid;
  align-items: center;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  text-align: center;
}

.report-calendar__header strong {
  font-size: 14px;
}

.report-calendar__weekdays,
.report-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.report-calendar__weekdays span {
  padding: 6px 0;
  color: var(--muted-foreground);
  font-size: 10px;
  text-align: center;
}

.report-calendar__day {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
  font: inherit;
  place-items: center;
}

.report-calendar__day:hover:not(:disabled) {
  background: var(--interactive-hover-background);
}

.report-calendar__day.is-outside {
  color: var(--muted-foreground);
  opacity: 0.45;
}

.report-calendar__day.is-in-range {
  border-radius: 0;
  background: color-mix(in oklch, var(--primary-600) 10%, transparent);
}

.report-calendar__day.is-selected {
  background: var(--primary-600);
  color: white;
  font-weight: 700;
}

.report-calendar__day:disabled {
  cursor: not-allowed;
  opacity: 0.25;
}

.report-calendar__day b {
  position: absolute;
  right: 3px;
  bottom: 2px;
  display: grid;
  min-width: 13px;
  height: 13px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--primary-100);
  color: var(--primary-700);
  font-size: 8px;
  line-height: 1;
  place-items: center;
}

.report-calendar__day.is-selected b {
  background: white;
  color: var(--primary-700);
}

.report-calendar__guide,
.report-calendar__status {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 11px;
}

.report-calendar__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.report-calendar__status.is-error {
  color: var(--destructive);
}
</style>
