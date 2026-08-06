import { describe, expect, it } from 'vitest'
import type { StudentDetail } from './model'
import {
  buildStudentUpdateInput,
  formatGuardianContact,
  getStudentBirthdayMax,
  normalizeStudentCreateInput,
  STUDENT_IMAGE_MAX_BYTES,
  STUDENT_MEMO_MAX_LENGTH,
  normalizeTeacherMemo,
  validateStudentForm,
  validateStudentImage,
  validateTeacherMemo,
  type StudentFormDraft,
} from './validation'

const validDraft: StudentFormDraft = {
  name: ' 김하늘 ',
  birthday: '2018-03-15',
  gender: 'Boy',
  school: ' 새봄초등학교 ',
  guardian: ' 김보호 ',
  guardianContact: ' 010-1234-5678 ',
  guardianEmail: ' guardian@example.com ',
  address: ' 서울시 ',
}

const detail: StudentDetail = {
  studentId: 7,
  name: '김하늘',
  birthday: '2018-03-15',
  gender: 'Boy',
  school: '새봄초등학교',
  guardian: '김보호',
  guardianContact: '010-1234-5678',
  guardianEmail: 'guardian@example.com',
  address: '서울시',
  createdAt: '2026-01-01T00:00:00+09:00',
  imageUrl: null,
  teacherMemo: null,
}

describe('Student form validation', () => {
  it('연락처는 숫자만 받아 11자리에서 자르고 하이픈을 자동으로 붙인다', () => {
    expect(formatGuardianContact('010')).toBe('010')
    expect(formatGuardianContact('0101')).toBe('010-1')
    expect(formatGuardianContact('01012345678')).toBe('010-1234-5678')
    expect(formatGuardianContact('010-12가34 5678')).toBe('010-1234-5678')
    expect(formatGuardianContact('01012345678999')).toBe('010-1234-5678')
  })

  it('필수값 trim, 날짜 실재 여부·오늘 및 미래 날짜, enum을 검증한다', () => {
    const errors = validateStudentForm(
      {
        ...validDraft,
        name: '   ',
        birthday: '2026-02-30',
        gender: '',
      },
      new Date('2026-07-27T12:00:00'),
    )

    expect(errors).toMatchObject({
      name: expect.any(String),
      birthday: expect.any(String),
      gender: expect.any(String),
    })
    const today = new Date('2026-07-27T12:00:00')
    expect(
      validateStudentForm({ ...validDraft, birthday: '2026-07-27' }, today).birthday,
    ).toContain('오늘 이전')
    expect(
      validateStudentForm({ ...validDraft, birthday: '2026-07-28' }, today).birthday,
    ).toContain('오늘 이전')
    expect(
      validateStudentForm({ ...validDraft, birthday: '2026-07-26' }, today).birthday,
    ).toBeUndefined()
    expect(getStudentBirthdayMax(today)).toBe('2026-07-26')
  })

  it('선택 이메일은 비어 있을 수 있지만 형식과 DB 길이를 검증한다', () => {
    expect(validateStudentForm({ ...validDraft, guardianEmail: '' }).guardianEmail).toBeUndefined()
    expect(
      validateStudentForm({ ...validDraft, guardianEmail: 'invalid-email' }).guardianEmail,
    ).toContain('올바른')
    expect(validateStudentForm({ ...validDraft, address: '가'.repeat(101) }).address).toContain(
      '100자',
    )
  })

  it('이름·연락처·제어문자처럼 필드 의도와 다른 값을 거부한다', () => {
    expect(validateStudentForm({ ...validDraft, name: '김하늘1' }).name).toContain('문자')
    expect(
      validateStudentForm({ ...validDraft, guardianContact: '전화주세요' }).guardianContact,
    ).toContain('숫자 11자리')
    expect(
      validateStudentForm({ ...validDraft, guardianContact: '01012345678' }).guardianContact,
    ).toContain('숫자 11자리')
    expect(
      validateStudentForm({ ...validDraft, guardianContact: '011-1234-5678' }).guardianContact,
    ).toContain('010')
    expect(validateStudentForm({ ...validDraft, school: '학교\n이름' }).school).toContain(
      '제어 문자',
    )
    expect(validateStudentForm({ ...validDraft, address: '주소\u0000' }).address).toContain(
      '제어 문자',
    )
  })

  it('등록 입력은 문자열을 trim하고 빈 선택값을 null로 만든다', () => {
    expect(
      normalizeStudentCreateInput({
        ...validDraft,
        guardianEmail: ' ',
        address: '',
      }),
    ).toEqual({
      name: '김하늘',
      birthday: '2018-03-15',
      gender: 'Boy',
      school: '새봄초등학교',
      guardian: '김보호',
      guardianContact: '010-1234-5678',
      guardianEmail: null,
      address: null,
    })
  })

  it('수정 입력은 바뀐 필드만 포함하고 선택 문자열 삭제를 null로 표현한다', () => {
    expect(buildStudentUpdateInput(detail, validDraft)).toEqual({})
    expect(
      buildStudentUpdateInput(detail, {
        ...validDraft,
        school: '푸른초등학교',
        guardianEmail: '',
      }),
    ).toEqual({
      school: '푸른초등학교',
      guardianEmail: null,
    })
  })
})

describe('Student image validation', () => {
  it('확장자와 MIME이 모두 JPG/PNG인 파일만 허용한다', () => {
    expect(validateStudentImage(new File(['a'], 'profile.jpg', { type: 'image/jpeg' }))).toBeNull()
    expect(validateStudentImage(new File(['a'], 'profile.png', { type: 'image/jpeg' }))).toContain(
      'JPG 또는 PNG',
    )
    expect(validateStudentImage(new File(['a'], 'profile.gif', { type: 'image/png' }))).toContain(
      'JPG 또는 PNG',
    )
    expect(
      validateStudentImage(new File(['a'], 'profile.png', { type: 'application/octet-stream' })),
    ).toContain('JPG 또는 PNG')
  })

  it('5MB를 초과하는 이미지를 거부한다', () => {
    const image = new File([new Uint8Array(STUDENT_IMAGE_MAX_BYTES + 1)], 'large.png', {
      type: 'image/png',
    })
    expect(validateStudentImage(image)).toContain('5MB')
  })
})

describe('Teacher memo validation', () => {
  it('앞뒤 공백을 제거하고 빈 값은 null로 만든다', () => {
    expect(normalizeTeacherMemo('  학습 메모  ')).toBe('학습 메모')
    expect(normalizeTeacherMemo('   ')).toBeNull()
  })

  it('trim된 값 1,000자는 허용하고 1,001자는 거부한다', () => {
    expect(validateTeacherMemo('가'.repeat(STUDENT_MEMO_MAX_LENGTH))).toBeNull()
    expect(validateTeacherMemo(`  ${'가'.repeat(STUDENT_MEMO_MAX_LENGTH)}  `)).toBeNull()
    expect(validateTeacherMemo('가'.repeat(STUDENT_MEMO_MAX_LENGTH + 1))).toContain('1,000')
  })

  it('줄바꿈은 허용하지만 그 밖의 제어문자는 거부한다', () => {
    expect(validateTeacherMemo('첫 줄\n둘째 줄')).toBeNull()
    expect(validateTeacherMemo('메모\u0000')).toContain('제어 문자')
  })
})
