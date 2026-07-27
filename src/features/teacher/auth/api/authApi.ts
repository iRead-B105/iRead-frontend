import { apiRequest, jsonBody } from '@/lib/api'
import type {
  LoginInput,
  ResetPasswordInput,
  SignUpInput,
  SignUpResult,
  TokenRefreshResult,
} from '../model'

export interface LoginResponseDto extends TokenRefreshResult {
  readonly teacherId: string
  readonly email: string
  readonly name: string
  readonly organization: string | null
  readonly profileImageUrl: string | null
  readonly loginStatus: string
}

export type AuthRequest = <T>(
  endpoint: string,
  init?: RequestInit,
  options?: { readonly retryOnUnauthorized?: boolean },
) => Promise<T>

export interface AdminAuthApi {
  readonly login: (input: LoginInput) => Promise<LoginResponseDto>
  readonly signUp: (input: SignUpInput) => Promise<SignUpResult>
  readonly refresh: () => Promise<TokenRefreshResult>
  readonly logout: () => Promise<void>
  readonly resetPassword: (input: ResetPasswordInput) => Promise<void>
}

export function createAdminAuthApi(request: AuthRequest = apiRequest): AdminAuthApi {
  const noRefreshRetry = { retryOnUnauthorized: false } as const

  return {
    login: (input) =>
      request<LoginResponseDto>(
        '/api/auth/admin/login',
        {
          method: 'POST',
          body: jsonBody(input),
        },
        noRefreshRetry,
      ),
    signUp: (input) =>
      request<SignUpResult>(
        '/api/auth/admin/sign-up',
        {
          method: 'POST',
          body: jsonBody(input),
        },
        noRefreshRetry,
      ),
    refresh: () =>
      request<TokenRefreshResult>(
        '/api/auth/admin/refresh',
        {
          method: 'POST',
        },
        noRefreshRetry,
      ),
    logout: () =>
      request<void>(
        '/api/auth/admin/logout',
        {
          method: 'POST',
        },
        noRefreshRetry,
      ),
    resetPassword: (input) =>
      request<void>(
        '/api/auth/admin/password-reset',
        {
          method: 'POST',
          body: jsonBody(input),
        },
        noRefreshRetry,
      ),
  }
}
