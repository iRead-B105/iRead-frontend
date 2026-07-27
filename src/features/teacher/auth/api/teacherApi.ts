import { apiRequest } from '@/lib/api'
import type { TeacherProfile } from '../model'

export type TeacherRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>

export interface TeacherApi {
  readonly getInfo: () => Promise<TeacherProfile>
}

export function createTeacherApi(request: TeacherRequest = apiRequest): TeacherApi {
  return {
    getInfo: () => request<TeacherProfile>('/api/admin/teacher/info'),
  }
}
