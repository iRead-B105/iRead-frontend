import { authSource } from '@/config/authSource'
import type { AuthSource } from '@/config/env'
import { ApiAuthRepository } from './apiAuthRepository'
import { ApiTeacherRepository } from './apiTeacherRepository'
import type { AuthRepository } from './authRepository'
import { MockAuthRepository } from './mockAuthRepository'
import { MockTeacherRepository } from './mockTeacherRepository'
import type { TeacherRepository } from './teacherRepository'

export * from './apiAuthRepository'
export * from './apiTeacherRepository'
export * from './authRepository'
export * from './mockAuthRepository'
export * from './mockTeacherRepository'
export * from './teacherRepository'

export interface AuthRepositories {
  readonly auth: AuthRepository
  readonly teacher: TeacherRepository
  readonly source: AuthSource
}

export interface AuthRepositoryOverrides {
  readonly apiAuth?: AuthRepository
  readonly apiTeacher?: TeacherRepository
  readonly mockAuth?: AuthRepository
  readonly mockTeacher?: TeacherRepository
}

export function createAuthRepositories(
  source: AuthSource,
  overrides: AuthRepositoryOverrides = {},
): AuthRepositories {
  if (source === 'api') {
    return {
      source,
      auth: overrides.apiAuth ?? new ApiAuthRepository(),
      teacher: overrides.apiTeacher ?? new ApiTeacherRepository(),
    }
  }

  return {
    source,
    auth: overrides.mockAuth ?? new MockAuthRepository(),
    teacher: overrides.mockTeacher ?? new MockTeacherRepository(),
  }
}

export const authRepositories: AuthRepositories = import.meta.env.PROD
  ? {
      source: 'api',
      auth: new ApiAuthRepository(),
      teacher: new ApiTeacherRepository(),
    }
  : createAuthRepositories(authSource)
