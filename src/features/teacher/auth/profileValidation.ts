import type { TeacherGender, TeacherProfile } from './model'

export const TEACHER_PROFILE_MAX_LENGTH = {
  name: 10,
  organization: 100,
} as const

export type TeacherProfileGenderDraft = TeacherGender | 'UNSPECIFIED'

export interface TeacherProfileDraft {
  name: string
  organization: string
  gender: TeacherProfileGenderDraft
}

export interface TeacherProfileUpdateInput {
  readonly name: string
  readonly organization: string | null
  readonly gender: TeacherGender | null
}

export type TeacherProfileFormErrors = Partial<Record<keyof TeacherProfileDraft, string>>

export function createTeacherProfileDraft(profile: TeacherProfile): TeacherProfileDraft {
  return {
    name: profile.name,
    organization: profile.organization ?? '',
    gender: profile.gender ?? 'UNSPECIFIED',
  }
}

export function validateTeacherProfileDraft(
  draft: TeacherProfileDraft,
): TeacherProfileFormErrors {
  const errors: TeacherProfileFormErrors = {}
  const name = draft.name.trim()
  const organization = draft.organization.trim()

  if (!name) {
    errors.name = '이름을 입력해 주세요.'
  } else if (name.length > TEACHER_PROFILE_MAX_LENGTH.name) {
    errors.name = `이름은 ${TEACHER_PROFILE_MAX_LENGTH.name}자 이내로 입력해 주세요.`
  }

  if (organization.length > TEACHER_PROFILE_MAX_LENGTH.organization) {
    errors.organization = `소속 기관은 ${TEACHER_PROFILE_MAX_LENGTH.organization}자 이내로 입력해 주세요.`
  }

  if (!['MALE', 'FEMALE', 'UNSPECIFIED'].includes(draft.gender)) {
    errors.gender = '성별을 다시 선택해 주세요.'
  }

  return errors
}

export function normalizeTeacherProfileDraft(
  draft: TeacherProfileDraft,
): TeacherProfileUpdateInput {
  return {
    name: draft.name.trim(),
    organization: draft.organization.trim() || null,
    gender: draft.gender === 'UNSPECIFIED' ? null : draft.gender,
  }
}

export function isSameTeacherProfileDraft(
  draft: TeacherProfileDraft,
  profile: TeacherProfile,
): boolean {
  const normalized = normalizeTeacherProfileDraft(draft)
  return (
    normalized.name === profile.name &&
    normalized.organization === profile.organization &&
    normalized.gender === profile.gender
  )
}
