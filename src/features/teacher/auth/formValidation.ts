import type { PasswordResetConfirmInput, SignUpInput } from './model'

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
  const email = validateEmail(input.email)
  if (!email.ok) return email

  if (input.password.length < 8 || input.password.length > 100) {
    return {
      ok: false,
      message: '비밀번호는 8~100자로 입력해 주세요.',
      field: 'password',
    }
  }

  if (input.password !== input.passwordConfirm) {
    return {
      ok: false,
      message: '비밀번호와 비밀번호 확인이 일치하지 않습니다.',
      field: 'passwordConfirm',
    }
  }

  const name = input.name.trim()
  if (name.length < 1 || name.length > 10) {
    return { ok: false, message: '이름은 1~10자로 입력해 주세요.', field: 'name' }
  }

  const organization = input.organization.trim()
  if (organization.length < 1 || organization.length > 100) {
    return {
      ok: false,
      message: '소속은 1~100자로 입력해 주세요.',
      field: 'organization',
    }
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
