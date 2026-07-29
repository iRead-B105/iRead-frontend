import { apiRequest, jsonBody } from '@/lib/api'
import { serializeStudentListQuery } from './query'
import { resolveTrainingHistoryDateRange } from './trainingHistoryPeriod'
import type {
  StudentAccuracyTrend,
  StudentCreateInput,
  StudentDetail,
  StudentLearningEvent,
  StudentLearningEventDetail,
  StudentLearningEventType,
  StudentLearningSummary,
  StudentListQuery,
  StudentListResult,
  StudentMutationCommand,
  StudentSummary,
  StudentTrainingHistory,
  StudentTrainingHistoryPeriod,
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
  readonly getLearningSummary: (
    studentId: number,
    options?: StudentRequestOptions,
  ) => Promise<StudentLearningSummary>
  readonly listLearningEvents: (
    studentId: number,
    query?: { readonly limit?: number },
    options?: StudentRequestOptions,
  ) => Promise<readonly StudentLearningEvent[]>
  readonly getLearningEvent: (
    studentId: number,
    eventType: StudentLearningEventType,
    eventId: number,
    options?: StudentRequestOptions,
  ) => Promise<StudentLearningEventDetail>
  readonly getAccuracyTrend: (
    studentId: number,
    options?: StudentRequestOptions,
  ) => Promise<StudentAccuracyTrend>
  readonly getTrainingHistory: (
    studentId: number,
    period: StudentTrainingHistoryPeriod,
    options?: StudentRequestOptions,
  ) => Promise<StudentTrainingHistory>
  readonly updateTeacherMemo: (
    studentId: number,
    teacherMemo: string | null,
  ) => Promise<void>
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

type LearningEventDto = Omit<StudentLearningEvent, 'eventType'> & {
  readonly eventType: Lowercase<StudentLearningEventType>
}

type LearningEventDetailDto = Omit<StudentLearningEventDetail, 'eventType'> & {
  readonly eventType: Lowercase<StudentLearningEventType>
}

function mapLearningEvent<T extends LearningEventDto | LearningEventDetailDto>(
  event: T,
): Omit<T, 'eventType'> & { eventType: StudentLearningEventType } {
  return {
    ...event,
    eventType: event.eventType.toUpperCase() as StudentLearningEventType,
  }
}

export function createStudentApi(
  request: StudentApiRequest = apiRequest,
  now: () => Date = () => new Date(),
): StudentApi {
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
    getDetail(studentId, options) {
      return request<StudentDetail>(`/api/admin/student/${studentId}`, {
        signal: options?.signal,
      })
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
    getLearningSummary(studentId, options) {
      return request<StudentLearningSummary>(
        `/api/admin/student/${studentId}/learning-summary`,
        { signal: options?.signal },
      )
    },
    async listLearningEvents(studentId, query = {}, options) {
      const search = new URLSearchParams()
      if (query.limit !== undefined) search.set('limit', String(query.limit))
      const suffix = search.size ? `?${search}` : ''
      const result = await request<{ events: readonly LearningEventDto[] }>(
        `/api/admin/student/${studentId}/learning-events/recent${suffix}`,
        { signal: options?.signal },
      )
      return result.events.map(mapLearningEvent)
    },
    async getLearningEvent(studentId, eventType, eventId, options) {
      const query = new URLSearchParams({
        eventType: eventType.toLowerCase(),
        eventId: String(eventId),
      })
      const result = await request<LearningEventDetailDto>(
        `/api/admin/student/${studentId}/learning-events?${query}`,
        { signal: options?.signal },
      )
      return mapLearningEvent(result)
    },
    getAccuracyTrend(studentId, options) {
      return request<StudentAccuracyTrend>(
        `/api/admin/student/${studentId}/accuracy-trend`,
        { signal: options?.signal },
      )
    },
    getTrainingHistory(studentId, period, options) {
      const { from, to } = resolveTrainingHistoryDateRange(period, now())
      const search = new URLSearchParams({ from, to })
      return request<StudentTrainingHistory>(
        `/api/admin/student/${studentId}/training-history?${search}`,
        { signal: options?.signal },
      )
    },
    updateTeacherMemo(studentId, teacherMemo) {
      return request<void>(`/api/admin/student/${studentId}`, {
        method: 'PATCH',
        body: jsonBody({ teacherMemo }),
      })
    },
  }
}
