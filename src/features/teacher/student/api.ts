import { apiRequest, jsonBody } from '@/lib/api'
import { serializeStudentListQuery } from './query'
import type {
  StudentCreateInput,
  StudentDetail,
  StudentListQuery,
  StudentListResult,
  StudentMutationCommand,
  StudentSummary,
  StudentUpdateInput,
} from './model'
import type { StudentRequestOptions } from './repositories/studentRepository'

export type StudentApiRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>

export interface StudentApi {
  readonly list: (
    query?: StudentListQuery,
    options?: StudentRequestOptions,
  ) => Promise<StudentListResult>
  readonly getSummary: (options?: StudentRequestOptions) => Promise<StudentSummary>
  readonly getDetail: (
    studentId: number,
    options?: StudentRequestOptions,
  ) => Promise<StudentDetail>
  readonly create: (command: StudentMutationCommand<StudentCreateInput>) => Promise<number>
  readonly update: (
    studentId: number,
    command: StudentMutationCommand<StudentUpdateInput>,
  ) => Promise<void>
  readonly remove: (studentId: number) => Promise<void>
}

interface StudentDetailResponse extends Omit<StudentDetail, 'studentId' | 'createdAt'> {
  readonly studentId?: number
  readonly id?: number
  readonly createdAt?: string
}

function mutationBody<TInput>(command: StudentMutationCommand<TInput>): BodyInit {
  if (!command.image) return jsonBody(command.input)

  const body = new FormData()
  body.append(
    'request',
    new Blob([JSON.stringify(command.input)], { type: 'application/json' }),
  )
  body.append('image', command.image)
  return body
}

export function createStudentApi(request: StudentApiRequest = apiRequest): StudentApi {
  return {
    list(query, options) {
      const search = serializeStudentListQuery(query)
      return request<StudentListResult>(`/api/admin/student/list?${search}`, {
        signal: options?.signal,
      })
    },
    getSummary(options) {
      return request<StudentSummary>('/api/admin/student/summary', {
        signal: options?.signal,
      })
    },
    async getDetail(studentId, options) {
      const detail = await request<StudentDetailResponse>(`/api/admin/student/${studentId}`, {
        signal: options?.signal,
      })
      return {
        ...detail,
        studentId: detail.studentId ?? detail.id ?? studentId,
        createdAt: detail.createdAt ?? '',
      }
    },
    async create(command) {
      const result = await request<{ studentId: number }>('/api/admin/student', {
        method: 'POST',
        body: mutationBody(command),
      })
      return result.studentId
    },
    update(studentId, command) {
      return request<void>(`/api/admin/student/${studentId}`, {
        method: 'PATCH',
        body: mutationBody(command),
      })
    },
    remove(studentId) {
      return request<void>(`/api/admin/student/${studentId}`, {
        method: 'DELETE',
      })
    },
  }
}
