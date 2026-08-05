import { describe, expect, it } from 'vitest'
import { validateEmail, validateResetPasswordForm, validateSignUpForm } from './formValidation'

describe('authentication form validation', () => {
  it('회원가입 입력을 trim하고 API 계약 필드만 반환한다', () => {
    expect(
      validateSignUpForm({
        email: ' teacher@example.com ',
        password: 'password',
        passwordConfirm: 'password',
        name: ' 교수자 ',
        organization: ' iRead 센터 ',
      }),
    ).toEqual({
      ok: true,
      value: {
        email: 'teacher@example.com',
        password: 'password',
        name: '교수자',
        organization: 'iRead 센터',
      },
    })
  })

  it.each([
    ['invalid-email', '올바른 이메일을 50자 이내로 입력해 주세요.', 'email'],
    ['password', '비밀번호와 비밀번호 확인이 일치하지 않습니다.', 'passwordConfirm'],
    ['name', '이름은 1~10자로 입력해 주세요.', 'name'],
    ['organization', '소속은 1~100자로 입력해 주세요.', 'organization'],
  ])('잘못된 회원가입 %s 입력을 거부한다', (field, expected, expectedField) => {
    const input = {
      email: field === 'invalid-email' ? 'invalid' : 'teacher@example.com',
      password: 'password',
      passwordConfirm: field === 'password' ? 'different' : 'password',
      name: field === 'name' ? '이름이열한자를초과합니다' : '교수자',
      organization: field === 'organization' ? 'a'.repeat(101) : 'iRead 센터',
    }

    expect(validateSignUpForm(input)).toEqual({
      ok: false,
      message: expected,
      field: expectedField,
    })
  })

  it('비밀번호 재설정 확인 필드를 검증하고 trim한다', () => {
    expect(
      validateResetPasswordForm({
        token: ' reset-token ',
        newPassword: 'new-password',
        passwordConfirm: 'new-password',
      }),
    ).toEqual({
      ok: true,
      value: {
        token: 'reset-token',
        newPassword: 'new-password',
      },
    })
  })

  it('이메일 길이 제한을 적용한다', () => {
    expect(validateEmail(`${'a'.repeat(40)}@example.com`)).toMatchObject({ ok: false })
  })
})
