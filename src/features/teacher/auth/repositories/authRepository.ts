import type {
  LoginInput,
  LoginResult,
  ResetPasswordInput,
  SignUpInput,
  SignUpResult,
  TokenRefreshResult,
} from '../model'

export interface AuthRepository {
  readonly login: (input: LoginInput) => Promise<LoginResult>
  readonly signUp: (input: SignUpInput) => Promise<SignUpResult>
  readonly refresh: () => Promise<TokenRefreshResult>
  readonly logout: () => Promise<void>
  readonly resetPassword: (input: ResetPasswordInput) => Promise<void>
}
