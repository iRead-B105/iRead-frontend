import type {
  StudentCreateInput,
  StudentDetail,
  StudentGender,
  StudentUpdateInput,
} from './model'

export const STUDENT_FIELD_MAX_LENGTH = {
  name: 10,
  school: 20,
  guardian: 10,
  guardianContact: 20,
  guardianEmail: 50,
  address: 100,
} as const

export const STUDENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024

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
const allowedImageTypesByExtension: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function localDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

  if (!draft.birthday) {
    errors.birthday = '생년월일을 입력해 주세요.'
  } else if (!isValidDate(draft.birthday)) {
    errors.birthday = '올바른 생년월일을 입력해 주세요.'
  } else if (draft.birthday > localDateString(today)) {
    errors.birthday = '생년월일은 오늘 이후일 수 없습니다.'
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
  }

  return errors
}

export function validateStudentImage(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase()
  if (!extension || allowedImageTypesByExtension[extension] !== file.type) {
    return 'JPG 또는 PNG 파일만 선택할 수 있습니다.'
  }
  if (file.size > STUDENT_IMAGE_MAX_BYTES) {
    return '이미지는 5MB 이하만 선택할 수 있습니다.'
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
