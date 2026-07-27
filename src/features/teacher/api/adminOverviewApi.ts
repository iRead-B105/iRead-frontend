import { apiRequest } from '@/lib/api'
import type { TeacherGender } from '@/stores/session'

export interface TeacherInfoDto {
  readonly name: string
  readonly email: string
  readonly organization?: string
  readonly gender?: TeacherGender
  readonly profileImageUrl?: string | null
}

export interface StudentListItemDto {
  readonly name: string
  readonly age: string
  readonly lastLearningDate?: string | null
  readonly totalLearningTime?: number
  readonly recentTraining?: string | null
}

export interface StudentListDto {
  readonly students: readonly StudentListItemDto[]
}

export type AdminOverviewRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>

export interface AdminOverviewApi {
  readonly getTeacherInfo: () => Promise<TeacherInfoDto>
  readonly listStudents: () => Promise<StudentListDto>
  readonly logout: () => Promise<void>
}

export function createAdminOverviewApi(
  request: AdminOverviewRequest = apiRequest,
): AdminOverviewApi {
  return {
    getTeacherInfo: () => request<TeacherInfoDto>('/api/admin/teacher/info'),
    listStudents: () => request<StudentListDto>('/api/admin/student/list'),
    logout: () => request<void>('/api/auth/admin/logout', { method: 'POST' }),
  }
}
