import type { PasswordResetConfirmInput, SignUpInput } from './model'
import { hasDisallowedControlCharacter } from '@/lib/inputValidation'

export interface SignUpFormInput extends SignUpInput {
  readonly passwordConfirm: string
}

export interface ResetPasswordConfirmFormInput extends PasswordResetConfirmInput {
  readonly passwordConfirm: string
}

export type AuthenticationFormField =
  | 'email'
  | 'password'
  | 'passwordConfirm'
  | 'name'
  | 'organization'
  | 'token'
  | 'newPassword'

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false
      readonly message: string
      readonly field: AuthenticationFormField
    }

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const personNamePattern = /^[\p{L}\p{M}]+(?:[ .\-\u00B7'\u2019][\p{L}\p{M}]+)*$/u

export type SignUpFormErrors = Partial<
  Record<Exclude<AuthenticationFormField, 'token' | 'newPassword'>, string>
>

export function validateEmail(email: string): ValidationResult<string> {
  const value = email.trim()

  if (value === '' || value.length > 50 || !emailPattern.test(value)) {
    return {
      ok: false,
      message: '올바른 이메일을 50자 이내로 입력해 주세요.',
      field: 'email',
    }
  }

  return { ok: true, value }
}

export function validateSignUpForm(input: SignUpFormInput): ValidationResult<SignUpInput> {
  const errors = validateSignUpFields(input)
  const firstField = (
    ['email', 'password', 'passwordConfirm', 'name', 'organization'] as const
  ).find((field) => errors[field])
  if (firstField) {
    return {
      ok: false,
      message: errors[firstField] ?? '입력값을 확인해 주세요.',
      field: firstField,
    }
  }

  const email = validateEmail(input.email)
  if (!email.ok) return email
  const name = input.name.trim()
  const organization = input.organization.trim()

  return {
    ok: true,
    value: {
      email: email.value,
      password: input.password,
      name,
      organization,
    },
  }
}

export function validateSignUpFields(input: SignUpFormInput): SignUpFormErrors {
  const errors: SignUpFormErrors = {}
  const email = validateEmail(input.email)
  if (!email.ok) errors.email = email.message

  if (input.password.length < 8 || input.password.length > 100) {
    errors.password = '비밀번호는 8~100자로 입력해 주세요.'
  } else if (hasDisallowedControlCharacter(input.password)) {
    errors.password = '비밀번호에 줄바꿈이나 제어 문자를 입력할 수 없습니다.'
  }

  if (!input.passwordConfirm) {
    errors.passwordConfirm = '비밀번호 확인을 입력해 주세요.'
  } else if (input.password !== input.passwordConfirm) {
    errors.passwordConfirm = '비밀번호와 비밀번호 확인이 일치하지 않습니다.'
  }

  const name = input.name.trim()
  if (name.length < 1 || name.length > 10) {
    errors.name = '이름은 1~10자로 입력해 주세요.'
  } else if (!personNamePattern.test(name)) {
    errors.name = '이름은 문자와 이름 구분 기호(공백, 마침표, 하이픈)만 입력해 주세요.'
  }

  const organization = input.organization.trim()
  if (organization.length < 1 || organization.length > 100) {
    errors.organization = '소속은 1~100자로 입력해 주세요.'
  } else if (hasDisallowedControlCharacter(organization)) {
    errors.organization = '소속에 줄바꿈이나 제어 문자를 입력할 수 없습니다.'
  }

  return errors
}

export function validateResetPasswordForm(
  input: ResetPasswordConfirmFormInput,
): ValidationResult<PasswordResetConfirmInput> {
  const token = input.token.trim()
  if (token === '') {
    return {
      ok: false,
      message: '비밀번호 재설정 링크가 올바르지 않습니다.',
      field: 'token',
    }
  }

  if (input.newPassword.length < 8 || input.newPassword.length > 100) {
    return {
      ok: false,
      message: '새 비밀번호는 8~100자로 입력해 주세요.',
      field: 'newPassword',
    }
  }

  if (input.newPassword !== input.passwordConfirm) {
    return {
      ok: false,
      message: '새 비밀번호가 서로 일치하지 않습니다.',
      field: 'passwordConfirm',
    }
  }

  return {
    ok: true,
    value: {
      token,
      newPassword: input.newPassword,
    },
  }
}
