import { defineStore } from 'pinia'
import {
  authRepositories,
  type AuthRepositories,
  type LoginInput,
  type TeacherGender,
  type TeacherProfile,
} from '@/features/teacher/auth'
import { ApiError } from '@/lib/api'

export type { TeacherGender, TeacherProfile }
export type SessionTeacher = TeacherProfile
export type AuthenticationStatus = 'unknown' | 'restoring' | 'authenticated' | 'anonymous'

function isExpiredLogout(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 401 &&
    ['INVALID_REFRESH_TOKEN', 'UNAUTHORIZED'].includes(error.code)
  )
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    status: 'unknown' as AuthenticationStatus,
    accessToken: null as string | null,
    teacher: null as TeacherProfile | null,
    restorePromise: null as Promise<boolean> | null,
    refreshPromise: null as Promise<boolean> | null,
    loginPending: false,
    logoutPending: false,
    authenticationError: null as string | null,
  }),
  getters: {
    authenticated: (state) => state.status === 'authenticated',
  },
  actions: {
    initialize(teacher: TeacherProfile, accessToken?: string | null) {
      if (accessToken !== undefined) {
        this.accessToken = accessToken
      }
      this.teacher = teacher
      this.status = 'authenticated'
      this.authenticationError = null
    },
    replaceTeacherProfile(teacher: TeacherProfile) {
      this.teacher = { ...teacher }
    },
    reset() {
      this.accessToken = null
      this.teacher = null
      this.status = 'anonymous'
      this.authenticationError = null
    },
    async login(input: LoginInput, repositories: AuthRepositories = authRepositories) {
      if (this.loginPending) return false

      this.loginPending = true
      this.authenticationError = null

      try {
        const loginResult = await repositories.auth.login(input)
        if (!loginResult.accessToken) {
          throw new Error('[인증] 로그인 응답에 access token이 없습니다.')
        }

        this.accessToken = loginResult.accessToken
        const teacher = await repositories.teacher.getInfo()
        this.initialize(teacher, loginResult.accessToken)
        return true
      } catch (error) {
        this.reset()
        this.authenticationError = error instanceof Error ? error.message : '로그인에 실패했습니다.'
        throw error
      } finally {
        this.loginPending = false
      }
    },
    async refreshAccessToken(repositories: AuthRepositories = authRepositories) {
      if (repositories.source === 'mock') return false
      if (this.refreshPromise) return this.refreshPromise

      const refreshTask = (async () => {
        try {
          const result = await repositories.auth.refresh()
          this.accessToken = result.accessToken
          return true
        } catch {
          this.reset()
          return false
        }
      })()

      this.refreshPromise = refreshTask
      try {
        return await refreshTask
      } finally {
        if (this.refreshPromise === refreshTask) {
          this.refreshPromise = null
        }
      }
    },
    async restoreSession(repositories: AuthRepositories = authRepositories) {
      if (this.status === 'authenticated') return true
      if (this.status === 'anonymous') return false
      if (this.restorePromise) return this.restorePromise

      const restoreTask = (async () => {
        if (repositories.source === 'mock') {
          this.reset()
          return false
        }

        this.status = 'restoring'
        const refreshed = await this.refreshAccessToken(repositories)
        if (!refreshed) return false

        try {
          const teacher = await repositories.teacher.getInfo()
          this.initialize(teacher)
          return true
        } catch {
          this.reset()
          return false
        }
      })()

      this.restorePromise = restoreTask
      try {
        return await restoreTask
      } finally {
        if (this.restorePromise === restoreTask) {
          this.restorePromise = null
        }
      }
    },
    async handleUnauthorized(
      requestRetried: boolean,
      repositories: AuthRepositories = authRepositories,
    ) {
      if (requestRetried) {
        this.reset()
        return false
      }

      return this.refreshAccessToken(repositories)
    },
    async logout(repositories: AuthRepositories = authRepositories) {
      if (this.logoutPending) return false
      this.logoutPending = true
      this.authenticationError = null

      try {
        await repositories.auth.logout()
        this.reset()
        return true
      } catch (error) {
        if (isExpiredLogout(error)) {
          this.reset()
          return true
        }

        this.authenticationError =
          error instanceof Error ? error.message : '로그아웃에 실패했습니다.'
        throw error
      } finally {
        this.logoutPending = false
      }
    },
  },
})
