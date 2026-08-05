import type {
  LoginInput,
  LoginResult,
  PasswordResetConfirmInput,
  PasswordResetLinkRequestInput,
  SignUpInput,
  SignUpResult,
  TokenRefreshResult,
} from '../model'

export interface AuthRepository {
  readonly login: (input: LoginInput) => Promise<LoginResult>
  readonly signUp: (input: SignUpInput) => Promise<SignUpResult>
  readonly refresh: () => Promise<TokenRefreshResult>
  readonly logout: () => Promise<void>
  readonly requestPasswordReset: (input: PasswordResetLinkRequestInput) => Promise<void>
  readonly confirmPasswordReset: (input: PasswordResetConfirmInput) => Promise<void>
}
