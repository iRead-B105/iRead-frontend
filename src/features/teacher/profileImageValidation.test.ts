import { describe, expect, it } from 'vitest'
import {
  PROFILE_IMAGE_MAX_BYTES,
  validateProfileImage,
} from './profileImageValidation'

describe('profile image validation', () => {
  it('비어 있는 파일과 MIME·확장자가 일치하지 않는 파일을 거부한다', () => {
    expect(validateProfileImage(new File([], 'empty.png', { type: 'image/png' }))).toContain(
      '비어 있는',
    )
    expect(
      validateProfileImage(new File(['image'], 'profile.png', { type: 'image/jpeg' })),
    ).toContain('JPG 또는 PNG')
    expect(
      validateProfileImage(new File(['image'], 'profile.gif', { type: 'image/gif' })),
    ).toContain('JPG 또는 PNG')
  })

  it('JPG·PNG만 5MB 이하에서 허용한다', () => {
    expect(
      validateProfileImage(new File(['image'], 'profile.jpeg', { type: 'image/jpeg' })),
    ).toBeNull()
    expect(
      validateProfileImage(
        new File([new Uint8Array(PROFILE_IMAGE_MAX_BYTES + 1)], 'large.png', {
          type: 'image/png',
        }),
      ),
    ).toContain('5MB')
  })
})
