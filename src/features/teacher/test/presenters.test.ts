import { describe, expect, it } from 'vitest'
import {
  formatTestChange,
  formatTestPercent,
  formatTestScore,
  formatTestSeconds,
} from './presenters'

describe('test presenters', () => {
  it('null과 0을 서로 다른 표시값으로 유지한다', () => {
    expect(formatTestScore(null)).toBe('-')
    expect(formatTestScore(0)).toBe('0점')
    expect(formatTestPercent(null)).toBe('-')
    expect(formatTestPercent(0)).toBe('0%')
    expect(formatTestSeconds(null)).toBe('-')
    expect(formatTestSeconds(0)).toBe('0초')
  })

  it('서버 변화량을 그대로 표시하고 null에서는 비교 없음으로 표시한다', () => {
    expect(formatTestChange(null)).toBe('이전 검사 비교 없음')
    expect(formatTestChange(0)).toBe('이전 검사와 동일')
    expect(formatTestChange(8)).toBe('이전 검사 대비 +8점')
    expect(formatTestChange(-3)).toBe('이전 검사 대비 -3점')
  })
})
