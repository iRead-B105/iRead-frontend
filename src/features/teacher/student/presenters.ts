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
  return `${rate}% · ${completed}/${scheduled}`
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
