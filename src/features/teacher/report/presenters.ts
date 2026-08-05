import type { GazeMetricChange, ReportSnapshot } from './model'

export const ALIGNED_REPORT_READING_SPEED_UNIT = 'CORRECT_WORDS_PER_MINUTE'
export const ALIGNED_REPORT_SNAPSHOT_VERSION = 'teacher-report-v2'
export const ALIGNED_REPORT_CALCULATION_VERSION = 'reading-metrics-v1'

export function hasAlignedReportLearningMetrics(
  snapshot: Pick<
    ReportSnapshot,
    'snapshotVersion' | 'calculationVersion' | 'readingSpeedUnit'
  >,
): boolean {
  return (
    snapshot.snapshotVersion === ALIGNED_REPORT_SNAPSHOT_VERSION &&
    snapshot.calculationVersion === ALIGNED_REPORT_CALCULATION_VERSION &&
    snapshot.readingSpeedUnit === ALIGNED_REPORT_READING_SPEED_UNIT
  )
}

export function formatReportDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[1]}.${match[2]}.${match[3]}` : value
}

export function formatReportDateTime(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\.$/, '')
}

export function formatReportMinutes(value: number): string {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (hours === 0) return `${minutes}분`
  if (minutes === 0) return `${hours}시간`
  return `${hours}시간 ${minutes}분`
}

export function formatReportNumber(value: number | null, suffix = ''): string {
  return value === null ? '-' : `${Number(value.toFixed(2))}${suffix}`
}

export function formatGazeDuration(value: number | null): string {
  if (value === null) return '-'
  if (value >= 60_000) {
    const minutes = Math.floor(value / 60_000)
    const seconds = Number(((value % 60_000) / 1_000).toFixed(2))
    return `${minutes}분 ${seconds}초`
  }
  return `${Number((value / 1_000).toFixed(2))}초`
}

export function formatGazeCount(value: number | null): string {
  return value === null ? '-' : `${value}회`
}

export function formatGazeChange(
  change: GazeMetricChange | null | undefined,
  kind: 'duration' | 'count',
): string {
  if (!change || change.delta === null) return '비교 정보 없음'
  if (change.delta === 0) return '변화 없음'
  const prefix = change.delta > 0 ? '+' : ''
  const value =
    kind === 'duration' ? `${Number((change.delta / 1_000).toFixed(2))}초` : `${change.delta}회`
  return `${prefix}${value}`
}
