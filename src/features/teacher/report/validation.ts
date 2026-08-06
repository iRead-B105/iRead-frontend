export const REPORT_MEMO_MAX_LENGTH = 2_000

export interface ReportPeriodErrors {
  readonly startDate?: string
  readonly endDate?: string
}

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) && localDateString(date) === value
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parsePositiveReportId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function validateReportPeriod(
  startDate: string,
  endDate: string,
  today = localDateString(),
): ReportPeriodErrors {
  const errors: { startDate?: string; endDate?: string } = {}

  if (!startDate) {
    errors.startDate = '시작일을 선택해 주세요.'
  } else if (!isValidCalendarDate(startDate)) {
    errors.startDate = '올바른 시작일을 입력해 주세요.'
  }

  if (!endDate) {
    errors.endDate = '종료일을 선택해 주세요.'
  } else if (!isValidCalendarDate(endDate)) {
    errors.endDate = '올바른 종료일을 입력해 주세요.'
  }

  if (errors.startDate || errors.endDate) return errors
  if (startDate > endDate) {
    errors.endDate = '종료일은 시작일과 같거나 이후여야 합니다.'
  } else if (endDate > today) {
    errors.endDate = '종료일은 오늘 이후로 선택할 수 없습니다.'
  }

  return errors
}

export function validateOptionalReportPeriod(
  startDate: string,
  endDate: string,
  today = localDateString(),
): ReportPeriodErrors {
  const errors: { startDate?: string; endDate?: string } = {}
  if (startDate && !isValidCalendarDate(startDate)) {
    errors.startDate = '올바른 시작일을 입력해 주세요.'
  }
  if (endDate && !isValidCalendarDate(endDate)) {
    errors.endDate = '올바른 종료일을 입력해 주세요.'
  }
  if (errors.startDate || errors.endDate) return errors
  if (startDate && endDate && startDate > endDate) {
    errors.endDate = '종료일은 시작일과 같거나 이후여야 합니다.'
  } else if (startDate > today) {
    errors.startDate = '오늘 이후의 보고서 기간은 조회할 수 없습니다.'
  } else if (endDate > today) {
    errors.endDate = '오늘 이후의 보고서 기간은 조회할 수 없습니다.'
  }
  return errors
}

export function normalizeTeacherMemo(value: string): string | null {
  return value.trim() || null
}

export function validateTeacherMemo(value: string): string | null {
  if (value.length > REPORT_MEMO_MAX_LENGTH) {
    return `교수자 의견은 ${REPORT_MEMO_MAX_LENGTH.toLocaleString('ko-KR')}자 이하로 입력해 주세요.`
  }
  if (hasDisallowedControlCharacter(value, true)) {
    return '교수자 의견에 허용되지 않는 제어 문자가 포함되어 있습니다.'
  }
  return null
}
import { hasDisallowedControlCharacter } from '@/lib/inputValidation'
