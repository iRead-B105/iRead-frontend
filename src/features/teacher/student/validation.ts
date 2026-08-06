import type { StudentCreateInput, StudentDetail, StudentGender, StudentUpdateInput } from './model'
import {
  PROFILE_IMAGE_MAX_BYTES,
  validateProfileImage,
} from '@/features/teacher/profileImageValidation'
import { hasDisallowedControlCharacter } from '@/lib/inputValidation'

export const STUDENT_FIELD_MAX_LENGTH = {
  name: 10,
  school: 20,
  guardian: 10,
  guardianContact: 13,
  guardianEmail: 50,
  address: 100,
} as const

export const STUDENT_IMAGE_MAX_BYTES = PROFILE_IMAGE_MAX_BYTES
export const STUDENT_MEMO_MAX_LENGTH = 1000

export interface StudentFormDraft {
  name: string
  birthday: string
  gender: StudentGender | ''
  school: string
  guardian: string
  guardianContact: string
  guardianEmail: string
  address: string
}

export type StudentFormField = keyof StudentFormDraft | 'image'
export type StudentFormErrors = Partial<Record<StudentFormField, string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const personNamePattern = /^[\p{L}\p{M}]+(?:[ .\-\u00B7'\u2019][\p{L}\p{M}]+)*$/u
const guardianContactPattern = /^010-\d{4}-\d{4}$/

export function formatGuardianContact(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

function localDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getStudentBirthdayMax(today = new Date()): string {
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  return localDateString(yesterday)
}

function validateRequired(
  errors: StudentFormErrors,
  field: keyof typeof STUDENT_FIELD_MAX_LENGTH,
  value: string,
  label: string,
): void {
  if (!value.trim()) {
    errors[field] = `${label}을(를) 입력해 주세요.`
    return
  }
  if (value.trim().length > STUDENT_FIELD_MAX_LENGTH[field]) {
    errors[field] = `${label}은(는) ${STUDENT_FIELD_MAX_LENGTH[field]}자 이내로 입력해 주세요.`
    return
  }
  if (hasDisallowedControlCharacter(value)) {
    errors[field] = `${label}에 줄바꿈이나 제어 문자를 입력할 수 없습니다.`
  }
}

export function validateStudentForm(
  draft: StudentFormDraft,
  today = new Date(),
): StudentFormErrors {
  const errors: StudentFormErrors = {}
  validateRequired(errors, 'name', draft.name, '아동명')
  validateRequired(errors, 'school', draft.school, '학교명')
  validateRequired(errors, 'guardian', draft.guardian, '보호자명')
  validateRequired(errors, 'guardianContact', draft.guardianContact, '보호자 연락처')

  if (!errors.name && !personNamePattern.test(draft.name.trim())) {
    errors.name = '아동명은 문자와 이름 구분 기호(공백, 마침표, 하이픈)만 입력해 주세요.'
  }
  if (!errors.guardian && !personNamePattern.test(draft.guardian.trim())) {
    errors.guardian = '보호자명은 문자와 이름 구분 기호(공백, 마침표, 하이픈)만 입력해 주세요.'
  }
  if (!errors.guardianContact) {
    const contact = draft.guardianContact.trim()
    if (!guardianContactPattern.test(contact)) {
      errors.guardianContact = '연락처는 010으로 시작하는 숫자 11자리를 입력해 주세요.'
    }
  }

  if (!draft.birthday) {
    errors.birthday = '생년월일을 입력해 주세요.'
  } else if (!isValidDate(draft.birthday)) {
    errors.birthday = '올바른 생년월일을 입력해 주세요.'
  } else if (draft.birthday >= localDateString(today)) {
    errors.birthday = '생년월일은 오늘 이전 날짜여야 합니다.'
  }

  if (draft.gender !== 'Boy' && draft.gender !== 'Girl') {
    errors.gender = '성별을 선택해 주세요.'
  }

  const email = draft.guardianEmail.trim()
  if (email.length > STUDENT_FIELD_MAX_LENGTH.guardianEmail) {
    errors.guardianEmail = `보호자 이메일은 ${STUDENT_FIELD_MAX_LENGTH.guardianEmail}자 이내로 입력해 주세요.`
  } else if (email && !emailPattern.test(email)) {
    errors.guardianEmail = '올바른 이메일 주소를 입력해 주세요.'
  }

  if (draft.address.trim().length > STUDENT_FIELD_MAX_LENGTH.address) {
    errors.address = `주소는 ${STUDENT_FIELD_MAX_LENGTH.address}자 이내로 입력해 주세요.`
  } else if (hasDisallowedControlCharacter(draft.address)) {
    errors.address = '주소에 줄바꿈이나 제어 문자를 입력할 수 없습니다.'
  }

  return errors
}

export function validateStudentImage(file: File): string | null {
  return validateProfileImage(file)
}

export function normalizeTeacherMemo(value: string): string | null {
  return value.trim() || null
}

export function validateTeacherMemo(value: string): string | null {
  if (value.trim().length > STUDENT_MEMO_MAX_LENGTH) {
    return `교수자 내부 메모는 ${STUDENT_MEMO_MAX_LENGTH.toLocaleString('ko-KR')}자 이내로 입력해 주세요.`
  }
  if (hasDisallowedControlCharacter(value, true)) {
    return '교수자 내부 메모에 허용되지 않는 제어 문자가 포함되어 있습니다.'
  }
  return null
}

export function createStudentFormDraft(detail?: StudentDetail): StudentFormDraft {
  return {
    name: detail?.name ?? '',
    birthday: detail?.birthday ?? '',
    gender: detail?.gender ?? '',
    school: detail?.school ?? '',
    guardian: detail?.guardian ?? '',
    guardianContact: detail?.guardianContact ?? '',
    guardianEmail: detail?.guardianEmail ?? '',
    address: detail?.address ?? '',
  }
}

export function normalizeStudentCreateInput(draft: StudentFormDraft): StudentCreateInput {
  return {
    name: draft.name.trim(),
    birthday: draft.birthday,
    gender: draft.gender as StudentGender,
    school: draft.school.trim(),
    guardian: draft.guardian.trim(),
    guardianContact: draft.guardianContact.trim(),
    guardianEmail: draft.guardianEmail.trim() || null,
    address: draft.address.trim() || null,
  }
}

export function buildStudentUpdateInput(
  detail: StudentDetail,
  draft: StudentFormDraft,
): StudentUpdateInput {
  const normalized = normalizeStudentCreateInput(draft)
  const update: StudentUpdateInput = {}

  if (normalized.name !== detail.name) update.name = normalized.name
  if (normalized.birthday !== detail.birthday) update.birthday = normalized.birthday
  if (normalized.gender !== detail.gender) update.gender = normalized.gender
  if (normalized.school !== detail.school) update.school = normalized.school
  if (normalized.guardian !== detail.guardian) update.guardian = normalized.guardian
  if (normalized.guardianContact !== detail.guardianContact) {
    update.guardianContact = normalized.guardianContact
  }
  if (normalized.guardianEmail !== detail.guardianEmail) {
    update.guardianEmail = normalized.guardianEmail
  }
  if (normalized.address !== detail.address) update.address = normalized.address

  return update
}
