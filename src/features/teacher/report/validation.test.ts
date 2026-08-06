import { describe, expect, it } from 'vitest'
import {
  normalizeTeacherMemo,
  parsePositiveReportId,
  validateOptionalReportPeriod,
  validateReportPeriod,
  validateTeacherMemo,
} from './validation'

describe('report validation', () => {
  it('route studentId는 양의 정수만 허용한다', () => {
    expect(parsePositiveReportId('7')).toBe(7)
    expect(parsePositiveReportId(['8'])).toBe(8)
    expect(parsePositiveReportId('0')).toBeNull()
    expect(parsePositiveReportId('-1')).toBeNull()
    expect(parsePositiveReportId('1.5')).toBeNull()
    expect(parsePositiveReportId('student')).toBeNull()
  })

  it('날짜 존재, 형식, 순서, 오늘 이후 순으로 기간을 검증한다', () => {
    expect(validateReportPeriod('', '', '2026-07-28')).toEqual({
      startDate: '시작일을 선택해 주세요.',
      endDate: '종료일을 선택해 주세요.',
    })
    expect(validateReportPeriod('2026-02-30', '2026-07-01', '2026-07-28')).toEqual({
      startDate: '올바른 시작일을 입력해 주세요.',
    })
    expect(validateReportPeriod('2026-07-20', '2026-07-19', '2026-07-28')).toEqual({
      endDate: '종료일은 시작일과 같거나 이후여야 합니다.',
    })
    expect(validateReportPeriod('2026-07-20', '2026-07-29', '2026-07-28')).toEqual({
      endDate: '종료일은 오늘 이후로 선택할 수 없습니다.',
    })
    expect(validateReportPeriod('2025-01-01', '2026-07-28', '2026-07-28')).toEqual({})
  })

  it('의견은 앞뒤 공백을 제거하고 공백만 입력하면 null로 삭제한다', () => {
    expect(normalizeTeacherMemo('  의견입니다.\n')).toBe('의견입니다.')
    expect(normalizeTeacherMemo(' \n ')).toBeNull()
    expect(validateTeacherMemo('가'.repeat(2_000))).toBeNull()
    expect(validateTeacherMemo('가'.repeat(2_001))).toContain('2,000자')
    expect(validateTeacherMemo('의견\n두 번째 줄')).toBeNull()
    expect(validateTeacherMemo('의견\u0000')).toContain('제어 문자')
  })

  it('목록 필터는 빈 경계를 허용하되 날짜 형식·순서·미래 날짜를 거부한다', () => {
    expect(validateOptionalReportPeriod('', '', '2026-07-28')).toEqual({})
    expect(validateOptionalReportPeriod('2026-07-20', '', '2026-07-28')).toEqual({})
    expect(validateOptionalReportPeriod('2026-07-29', '', '2026-07-28')).toHaveProperty('startDate')
    expect(validateOptionalReportPeriod('2026-07-20', '2026-07-19', '2026-07-28')).toHaveProperty(
      'endDate',
    )
  })
})
