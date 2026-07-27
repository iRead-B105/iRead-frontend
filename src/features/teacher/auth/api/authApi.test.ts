import { describe, expect, it, vi } from 'vitest'
import { createAdminAuthApi, type AuthRequest } from './authApi'

describe('Admin Auth API', () => {
  it('이메일과 비밀번호를 관리자 로그인 endpoint로 보낸다', async () => {
    const requestMock = vi.fn().mockResolvedValue({
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    })
    const api = createAdminAuthApi(requestMock as unknown as AuthRequest)

    await api.login({
      email: 'teacher@example.com',
      password: 'password',
    })

    expect(requestMock).toHaveBeenCalledWith(
      '/api/auth/admin/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'teacher@example.com',
          password: 'password',
        }),
      },
      { retryOnUnauthorized: false },
    )
    expect(Object.keys(JSON.parse(String(requestMock.mock.calls[0]?.[1]?.body)))).toEqual([
      'email',
      'password',
    ])
  })

  it.each([
    ['refresh', '/api/auth/admin/refresh'],
    ['logout', '/api/auth/admin/logout'],
  ] as const)('%s 요청은 자동 refresh 재시도를 사용하지 않는다', async (method, endpoint) => {
    const requestMock = vi.fn().mockResolvedValue(undefined)
    const api = createAdminAuthApi(requestMock as unknown as AuthRequest)

    await api[method]()

    expect(requestMock).toHaveBeenCalledWith(
      endpoint,
      { method: 'POST' },
      { retryOnUnauthorized: false },
    )
  })

  it('API가 credentials를 처리할 수 있도록 refresh에 별도 token body를 보내지 않는다', async () => {
    const requestMock = vi.fn().mockResolvedValue({
      accessToken: 'refreshed-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    })
    const api = createAdminAuthApi(requestMock as unknown as AuthRequest)

    await api.refresh()

    expect(requestMock.mock.calls[0]?.[1]?.body).toBeUndefined()
  })

  it('회원가입 목표 필드만 관리자 endpoint로 보낸다', async () => {
    const requestMock = vi.fn().mockResolvedValue({
      teacherId: '1',
      email: 'teacher@example.com',
      signUpStatus: 'COMPLETED',
    })
    const api = createAdminAuthApi(requestMock as unknown as AuthRequest)

    await api.signUp({
      email: 'teacher@example.com',
      password: 'password',
      name: '교수자',
      organization: 'iRead 센터',
    })

    expect(requestMock).toHaveBeenCalledWith(
      '/api/auth/admin/sign-up',
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'teacher@example.com',
          password: 'password',
          name: '교수자',
          organization: 'iRead 센터',
        }),
      },
      { retryOnUnauthorized: false },
    )
    expect(Object.keys(JSON.parse(String(requestMock.mock.calls[0]?.[1]?.body)))).toEqual([
      'email',
      'password',
      'name',
      'organization',
    ])
  })

  it('비밀번호 재설정 목표 필드만 관리자 endpoint로 보낸다', async () => {
    const requestMock = vi.fn().mockResolvedValue(undefined)
    const api = createAdminAuthApi(requestMock as unknown as AuthRequest)

    await api.resetPassword({
      email: 'teacher@example.com',
      verificationCode: 'verification-code',
      newPassword: 'new-password',
    })

    expect(requestMock).toHaveBeenCalledWith(
      '/api/auth/admin/password-reset',
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'teacher@example.com',
          verificationCode: 'verification-code',
          newPassword: 'new-password',
        }),
      },
      { retryOnUnauthorized: false },
    )
  })
})
