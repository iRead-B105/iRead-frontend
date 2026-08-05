import { ApiAuthRepository } from './apiAuthRepository'
import { ApiTeacherRepository } from './apiTeacherRepository'
import type { AuthRepository } from './authRepository'
import type { TeacherRepository } from './teacherRepository'

export * from './apiAuthRepository'
export * from './apiTeacherRepository'
export * from './authRepository'
export * from './teacherRepository'

export interface AuthRepositories {
  readonly auth: AuthRepository
  readonly teacher: TeacherRepository
}

export const authRepositories: AuthRepositories = {
  auth: new ApiAuthRepository(),
  teacher: new ApiTeacherRepository(),
}
