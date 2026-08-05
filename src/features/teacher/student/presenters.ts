export function formatLearningMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}분`
  if (minutes === 0) return `${hours}시간`
  return `${hours}시간 ${minutes}분`
}

export function formatLearningDate(date: string | null): string {
  if (!date) return '학습 기록 없음'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export function formatWeeklyParticipation(
  rate: number | null,
  completed: number,
  scheduled: number,
): string {
  if (scheduled === 0 || rate === null) return '일정 없음'
  return `${rate}% (${completed}일/${scheduled}일)`
}

export function formatStudentDateTime(value: string | null): string {
  if (!value) return '학습 기록 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function appendSummaryToTeacherMemo(currentValue: string, summary: string): string {
  const current = currentValue.trimEnd()
  const addition = summary.trim()
  if (!addition) return currentValue
  return current ? `${current}\n${addition}` : addition
}

export function formatLearningEventMemoSummary(event: StudentLearningEventDetail): string {
  const accuracy =
    event.accuracy === null ? '정확도 정보 없음' : `정확도 ${event.accuracy}%`
  const problems = event.problemSegments.length
    ? `문제 구간: ${event.problemSegments.join(', ')}`
    : '문제 구간 없음'
  const recommendation = event.recommendedCurriculumUnitName
    ? `권장 훈련: ${event.recommendedCurriculumUnitName}`
    : '권장 훈련 없음'
  return `[${studentLearningEventTypeLabels[event.eventType]} · ${formatStudentDateTime(event.occurredAt)}] ${accuracy} / 재시도 ${event.retryCount}회 / ${problems} / ${recommendation}`
}

export function formatTrainingDuration(item: StudentTrainingHistoryItem): string {
  if (!item.startedAt || !item.finishedAt) return '시간 정보 없음'
  const startedAt = new Date(item.startedAt)
  const finishedAt = new Date(item.finishedAt)
  const elapsedMinutes = Math.max(
    0,
    Math.round((finishedAt.getTime() - startedAt.getTime()) / 60_000),
  )
  return `${elapsedMinutes}분`
}
import type {
  StudentLearningEventDetail,
  StudentLearningEventType,
  StudentTrainingHistoryItem,
} from './model'

export const studentLearningEventTypeLabels = {
  TEST: '읽기 검사',
  TRAINING: '읽기 훈련',
  STORY: '이야기 학습',
  GAZE: '시선 분석',
} satisfies Record<StudentLearningEventType, string>
