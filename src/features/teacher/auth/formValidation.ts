import type { ResetPasswordInput, SignUpInput } from './model'

export interface SignUpFormInput extends SignUpInput {
  readonly passwordConfirm: string
}

export interface ResetPasswordFormInput extends ResetPasswordInput {
  readonly passwordConfirm: string
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string }

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): ValidationResult<string> {
  const value = email.trim()

  if (value === '' || value.length > 50 || !emailPattern.test(value)) {
    return { ok: false, message: '올바른 이메일을 50자 이내로 입력해 주세요.' }
  }

  return { ok: true, value }
}

export function validateSignUpForm(input: SignUpFormInput): ValidationResult<SignUpInput> {
  const email = validateEmail(input.email)
  if (!email.ok) return email

  if (input.password.length < 8 || input.password.length > 100) {
    return { ok: false, message: '비밀번호는 8~100자로 입력해 주세요.' }
  }

  if (input.password !== input.passwordConfirm) {
    return { ok: false, message: '비밀번호와 비밀번호 확인이 일치하지 않습니다.' }
  }

  const name = input.name.trim()
  if (name.length < 1 || name.length > 10) {
    return { ok: false, message: '이름은 1~10자로 입력해 주세요.' }
  }

  const organization = input.organization.trim()
  if (organization.length < 1 || organization.length > 100) {
    return { ok: false, message: '소속은 1~100자로 입력해 주세요.' }
  }

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

export function validateResetPasswordForm(
  input: ResetPasswordFormInput,
): ValidationResult<ResetPasswordInput> {
  const email = validateEmail(input.email)
  if (!email.ok) return email

  const verificationCode = input.verificationCode.trim()
  if (verificationCode === '') {
    return { ok: false, message: '검증 코드를 입력해 주세요.' }
  }

  if (input.newPassword.length < 8 || input.newPassword.length > 100) {
    return { ok: false, message: '새 비밀번호는 8~100자로 입력해 주세요.' }
  }

  if (input.newPassword !== input.passwordConfirm) {
    return { ok: false, message: '새 비밀번호가 서로 일치하지 않습니다.' }
  }

  return {
    ok: true,
    value: {
      email: email.value,
      verificationCode,
      newPassword: input.newPassword,
    },
  }
}
