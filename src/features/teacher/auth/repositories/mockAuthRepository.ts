import type { AuthRepository } from './authRepository'
import type {
  LoginInput,
  LoginResult,
  SignUpInput,
  SignUpResult,
  TokenRefreshResult,
} from '../model'

const unsupportedMessage =
  '[인증] 개발용 mock 로그인은 로그인 화면의 목업 진입 버튼을 사용해야 합니다.'

export class MockAuthRepository implements AuthRepository {
  async login(_input: LoginInput): Promise<LoginResult> {
    throw new Error(unsupportedMessage)
  }

  async signUp(_input: SignUpInput): Promise<SignUpResult> {
    throw new Error('[인증] mock 회원가입은 지원하지 않습니다.')
  }

  async refresh(): Promise<TokenRefreshResult> {
    throw new Error('[인증] mock 세션은 refresh를 사용하지 않습니다.')
  }

  async logout() {}

  async requestPasswordReset() {
    throw new Error('[인증] mock 비밀번호 재설정은 지원하지 않습니다.')
  }

  async confirmPasswordReset() {
    throw new Error('[인증] mock 비밀번호 재설정은 지원하지 않습니다.')
  }
}
