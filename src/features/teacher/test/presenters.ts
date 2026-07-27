export function formatTestDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatTestSeconds(value: number | null): string {
  if (value === null) return '-'
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  if (minutes === 0) return `${seconds}초`
  if (seconds === 0) return `${minutes}분`
  return `${minutes}분 ${seconds}초`
}

export function formatTestScore(value: number | null): string {
  return value === null ? '-' : `${value}점`
}

export function formatTestPercent(value: number | null): string {
  return value === null ? '-' : `${value}%`
}

export function formatTestChange(value: number | null): string {
  if (value === null) return '이전 검사 비교 없음'
  if (value === 0) return '이전 검사와 동일'
  return `이전 검사 대비 ${value > 0 ? '+' : ''}${value}점`
}
