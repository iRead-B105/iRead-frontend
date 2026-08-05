import { createAdminAuthApi, type AdminAuthApi } from '../api/authApi'
import type { AuthRepository } from './authRepository'

export class ApiAuthRepository implements AuthRepository {
  constructor(private readonly api: AdminAuthApi = createAdminAuthApi()) {}

  async login(input: Parameters<AuthRepository['login']>[0]) {
    const result = await this.api.login(input)

    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
    }
  }

  signUp(input: Parameters<AuthRepository['signUp']>[0]) {
    return this.api.signUp(input)
  }

  refresh() {
    return this.api.refresh()
  }

  logout() {
    return this.api.logout()
  }

  requestPasswordReset(input: Parameters<AuthRepository['requestPasswordReset']>[0]) {
    return this.api.requestPasswordReset(input)
  }

  confirmPasswordReset(input: Parameters<AuthRepository['confirmPasswordReset']>[0]) {
    return this.api.confirmPasswordReset(input)
  }
}
