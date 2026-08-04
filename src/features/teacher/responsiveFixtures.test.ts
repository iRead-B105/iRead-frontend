import { describe, expect, it } from 'vitest'
import { responsiveLongTextFixture } from '@/test/fixtures/responsive'

describe('responsiveLongTextFixture', () => {
  it('핵심 화면의 긴 텍스트 경계값을 재현한다', () => {
    expect(responsiveLongTextFixture.studentName).toHaveLength(10)
    expect(responsiveLongTextFixture.teacherOrganization.length).toBeGreaterThanOrEqual(50)
    expect(responsiveLongTextFixture.trainingName.length).toBeGreaterThanOrEqual(40)
    expect(responsiveLongTextFixture.memo.length).toBeGreaterThanOrEqual(2_000)
    expect(responsiveLongTextFixture.errorMessage.length).toBeGreaterThanOrEqual(50)
    expect(responsiveLongTextFixture.reportDescription.length).toBeGreaterThanOrEqual(50)
  })
})
