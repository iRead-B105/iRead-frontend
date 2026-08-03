export function formatTestDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatTestAnswer(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) return value.map(formatTestAnswer).join(', ')
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function formatRecommendationStatus(value: string | null): string {
  const labels: Readonly<Record<string, string>> = {
    NOT_REQUESTED: '추천 대기',
    PENDING: '추천 구성 대기',
    PROCESSING: '추천 구성 중',
    COMPLETED: '추천 구성 완료',
    FAILED: '추천 구성 실패',
  }
  return value === null ? '추천 상태 없음' : (labels[value] ?? value)
}

export function formatContentGenerationStatus(value: string | null): string {
  const labels: Readonly<Record<string, string>> = {
    NOT_READY: 'AI 콘텐츠 생성 대기',
    NOT_STARTED: 'AI 콘텐츠 생성 완료',
    MIXED: 'AI 콘텐츠 일부 생성',
  }
  return value === null ? '추천 커리큘럼 없음' : (labels[value] ?? value)
}

export function formatTeacherReviewStatus(value: string | null): string {
  const labels: Readonly<Record<string, string>> = {
    GENERATION_PENDING: 'AI 콘텐츠 생성 대기',
    REVIEW_REQUIRED: '최종 검수 필요',
    REGENERATION_REQUIRED: 'AI 콘텐츠 재생성 필요',
    REVIEW_COMPLETED: '최종 검수 완료',
    NOT_REQUIRED: '검수 불필요',
  }
  return value === null ? '검수 상태 없음' : (labels[value] ?? value)
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
