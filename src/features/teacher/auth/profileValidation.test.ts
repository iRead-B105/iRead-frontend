import { describe, expect, it } from 'vitest'
import type { TeacherProfile } from './model'
import {
  createTeacherProfileDraft,
  isSameTeacherProfileDraft,
  normalizeTeacherProfileDraft,
  validateTeacherProfileDraft,
} from './profileValidation'

const profile: TeacherProfile = {
  email: 'teacher@example.com',
  name: '이선생',
  organization: 'iRead 센터',
  gender: 'FEMALE',
  profileImageUrl: null,
}

describe('teacher profile validation', () => {
  it('이름 필수·최대 길이와 소속 기관 최대 길이를 검증한다', () => {
    expect(validateTeacherProfileDraft({ name: ' ', organization: '', gender: 'MALE' })).toEqual({
      name: '이름을 입력해 주세요.',
    })
    expect(
      validateTeacherProfileDraft({
        name: '가'.repeat(11),
        organization: '나'.repeat(101),
        gender: 'FEMALE',
      }),
    ).toMatchObject({
      name: expect.stringContaining('10자'),
      organization: expect.stringContaining('100자'),
    })
  })

  it('문자열을 trim하고 빈 소속·미선택 성별을 null로 정규화한다', () => {
    expect(
      normalizeTeacherProfileDraft({
        name: ' 박선생 ',
        organization: ' ',
        gender: 'UNSPECIFIED',
      }),
    ).toEqual({
      name: '박선생',
      organization: null,
      gender: null,
    })
  })

  it('이메일을 비교 대상에 넣지 않고 정규화된 수정 여부를 판단한다', () => {
    const draft = createTeacherProfileDraft(profile)
    expect(isSameTeacherProfileDraft({ ...draft, name: ' 이선생 ' }, profile)).toBe(true)
    expect(isSameTeacherProfileDraft({ ...draft, organization: '' }, profile)).toBe(false)
  })
})
