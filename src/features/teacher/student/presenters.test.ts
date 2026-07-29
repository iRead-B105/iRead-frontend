import { describe, expect, it } from 'vitest'
import { formatWeeklyParticipation } from './presenters'

describe('student presenters', () => {
  it('이번 주 상태를 비율과 완료일/예정일 형식으로 표시한다', () => {
    expect(formatWeeklyParticipation(33, 1, 3)).toBe('33% (1일/3일)')
  })

  it('예정이 없거나 참여율이 없으면 일정 없음으로 표시한다', () => {
    expect(formatWeeklyParticipation(null, 0, 0)).toBe('일정 없음')
    expect(formatWeeklyParticipation(null, 0, 3)).toBe('일정 없음')
  })
})
