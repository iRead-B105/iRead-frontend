import { describe, expect, it } from 'vitest'
import { hasDisallowedControlCharacter } from './inputValidation'

describe('input validation', () => {
  it('일반 유니코드와 이모지는 허용하고 제어문자만 구분한다', () => {
    expect(hasDisallowedControlCharacter('한글 English 😀')).toBe(false)
    expect(hasDisallowedControlCharacter('값\u0000')).toBe(true)
    expect(hasDisallowedControlCharacter('첫 줄\n둘째 줄')).toBe(true)
    expect(hasDisallowedControlCharacter('첫 줄\n둘째 줄', true)).toBe(false)
  })
})
