import { describe, expect, it } from 'vitest'
import {
  formatTestChange,
  formatTestAnswer,
  formatTestPercent,
  formatTestScore,
  formatTestSeconds,
  formatContentGenerationStatus,
  formatTeacherReviewStatus,
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

  it('선택형·배열·객체 제출 결과를 손실 없이 읽을 수 있는 문자열로 표시한다', () => {
    expect(formatTestAnswer(null)).toBe('-')
    expect(formatTestAnswer(0)).toBe('0')
    expect(formatTestAnswer(['ㄱ', 'ㅏ'])).toBe('ㄱ, ㅏ')
    expect(formatTestAnswer({ transcript: '나비' })).toBe('{"transcript":"나비"}')
  })

  it('서버 변화량을 그대로 표시하고 null에서는 비교 없음으로 표시한다', () => {
    expect(formatTestChange(null)).toBe('이전 검사 비교 없음')
    expect(formatTestChange(0)).toBe('이전 검사와 동일')
    expect(formatTestChange(8)).toBe('이전 검사 대비 +8점')
    expect(formatTestChange(-3)).toBe('이전 검사 대비 -3점')
  })

  it('추천 콘텐츠 생성과 교수자 최종 검수 상태를 구분한다', () => {
    expect(formatContentGenerationStatus('NOT_READY')).toBe('AI 콘텐츠 생성 대기')
    expect(formatContentGenerationStatus('NOT_STARTED')).toBe('AI 콘텐츠 생성 완료')
    expect(formatContentGenerationStatus('MIXED')).toBe('AI 콘텐츠 일부 생성')
    expect(formatTeacherReviewStatus('GENERATION_PENDING')).toBe('AI 콘텐츠 생성 대기')
    expect(formatTeacherReviewStatus('REVIEW_REQUIRED')).toBe('최종 검수 필요')
    expect(formatTeacherReviewStatus('REGENERATION_REQUIRED')).toBe('AI 콘텐츠 재생성 필요')
    expect(formatTeacherReviewStatus('REVIEW_COMPLETED')).toBe('최종 검수 완료')
  })
})
