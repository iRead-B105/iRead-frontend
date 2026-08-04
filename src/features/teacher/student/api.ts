import { apiRequest, jsonBody } from '@/lib/api'
import {
  resolveReferenceDate,
  type ReferenceDateResolver,
} from '@/features/teacher/devReferenceDate'
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
  StudentReadingSpeedTrend,
  StudentGender,
  StudentSummary,
  StudentTrainingHistory,
  StudentTrainingHistoryQuery,
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
  readonly getDetail: (studentId: number, options?: StudentRequestOptions) => Promise<StudentDetail>
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
  readonly getReadingSpeedTrend: (
    studentId: number,
    options?: StudentRequestOptions,
  ) => Promise<StudentReadingSpeedTrend>
  readonly getTrainingHistory: (
    studentId: number,
    query: StudentTrainingHistoryQuery,
    options?: StudentRequestOptions,
  ) => Promise<StudentTrainingHistory>
  readonly updateTeacherMemo: (studentId: number, teacherMemo: string | null) => Promise<void>
}

function mutationBody<TInput>(
  command: StudentMutationCommand<TInput>,
  input: unknown = command.input,
): BodyInit {
  if (!command.image) return jsonBody(input)

  const body = new FormData()
  body.append('request', new Blob([JSON.stringify(input)], { type: 'application/json' }))
  body.append('image', command.image)
  return body
}

function mapStudentUpdateInput(input: StudentUpdateInput): Readonly<Record<string, unknown>> {
  const request: Record<string, unknown> = { ...input }
  if (
    Object.prototype.hasOwnProperty.call(input, 'guardianEmail') &&
    input.guardianEmail === null
  ) {
    request.guardianEmail = ''
  }
  if (Object.prototype.hasOwnProperty.call(input, 'address') && input.address === null) {
    request.address = []
  }
  return request
}

type LearningEventDto = Omit<StudentLearningEvent, 'eventType'> & {
  readonly eventType: Lowercase<StudentLearningEventType>
}

type LearningEventDetailDto = Omit<StudentLearningEventDetail, 'eventType'> & {
  readonly eventType: Lowercase<StudentLearningEventType>
}

interface StudentTrainingHistoryDto {
  readonly learningHistory: readonly {
    readonly trainingId: number
    readonly date: string
    readonly learningType: string
    readonly learningCategory: string
    readonly startedAt: string | null
    readonly finishedAt: string | null
    readonly accuracyRate: number | null
    readonly questions: readonly {
      readonly questionNumber: number
      readonly question: string | null
      readonly correct: boolean
      readonly selectedAnswer: string | null
      readonly correctAnswer: string | null
    }[]
  }[]
}

interface StudentDetailDto {
  readonly id: number
  readonly name: string
  readonly birthday: string | null
  readonly gender: StudentGender | null
  readonly school: string | null
  readonly guardian: string | null
  readonly guardianContact: string | null
  readonly guardianEmail: string | null
  readonly address: unknown
  readonly imageUrl: string | null
  readonly teacherMemo: string | null
  readonly createdAt: string
}

interface StudentAccuracyTrendDto {
  readonly dailyAccuracy: readonly {
    readonly date: string
    readonly accuracyRate: number
  }[]
}

interface StudentReadingSpeedTrendDto {
  readonly unit: string
  readonly voiceChangeRate: number | null
  readonly points: readonly {
    readonly date: string
    readonly voiceSpeed: number | null
    readonly voiceWordCount?: number | null
    readonly voiceDurationMs?: number | null
    readonly trainingCount?: number | null
  }[]
}

function mapLearningEvent<T extends LearningEventDto | LearningEventDetailDto>(
  event: T,
): Omit<T, 'eventType'> & { eventType: StudentLearningEventType } {
  return {
    ...event,
    eventType: event.eventType.toUpperCase() as StudentLearningEventType,
  }
}

function addressPart(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  if (!Object.prototype.hasOwnProperty.call(value, 'value')) return null
  const part = (value as { readonly value?: unknown }).value
  return typeof part === 'string' ? part.trim() || null : null
}

function mapStudentAddress(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.trim() || null
  if (Array.isArray(value)) {
    const parts = value.map(addressPart).filter((part): part is string => part !== null)
    return parts.length > 0 ? parts.join(' ') : null
  }
  const part = addressPart(value)
  if (part !== null) return part
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

function mapStudentDetail(dto: StudentDetailDto): StudentDetail {
  return {
    studentId: dto.id,
    name: dto.name,
    birthday: dto.birthday,
    gender: dto.gender,
    school: dto.school,
    guardian: dto.guardian,
    guardianContact: dto.guardianContact,
    guardianEmail: dto.guardianEmail?.trim() || null,
    address: mapStudentAddress(dto.address),
    createdAt: dto.createdAt,
    imageUrl: dto.imageUrl,
    teacherMemo: dto.teacherMemo,
  }
}

export function createStudentApi(
  request: StudentApiRequest = apiRequest,
  now: () => Date = () => new Date(),
  referenceDate: ReferenceDateResolver = async () => null,
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
    async getDetail(studentId, options) {
      const detail = await request<StudentDetailDto>(`/api/admin/student/${studentId}`, {
        signal: options?.signal,
      })
      return mapStudentDetail(detail)
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
        body: mutationBody(command, mapStudentUpdateInput(command.input)),
      })
    },
    remove(studentId) {
      return request<void>(`/api/admin/student/${studentId}`, {
        method: 'DELETE',
      })
    },
    getLearningSummary(studentId, options) {
      return request<StudentLearningSummary>(`/api/admin/student/${studentId}/learning-summary`, {
        signal: options?.signal,
      })
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
    async getAccuracyTrend(studentId, options) {
      const result = await request<StudentAccuracyTrendDto>(
        `/api/admin/student/${studentId}/accuracy-trend`,
        { signal: options?.signal },
      )
      return {
        dailyAccuracy: result.dailyAccuracy.map(({ date, accuracyRate }) => ({
          date,
          accuracy: accuracyRate,
        })),
      }
    },
    async getReadingSpeedTrend(studentId, options) {
      const today = await resolveReferenceDate(studentId, now, referenceDate, options)
      const { from, to } = resolveTrainingHistoryDateRange('30d', today)
      const search = new URLSearchParams({ from, to })
      const result = await request<StudentReadingSpeedTrendDto>(
        `/api/admin/student/${studentId}/reading-speed-trend?${search}`,
        { signal: options?.signal },
      )
      return {
        unit: 'CORRECT_WORDS_PER_MINUTE',
        changeRate: result.voiceChangeRate,
        points: result.points
          .filter(
            (point): point is typeof point & { readonly voiceSpeed: number } =>
              point.voiceSpeed !== null,
          )
          .map(
            ({ date, voiceSpeed, voiceWordCount, voiceDurationMs, trainingCount }) => ({
              date,
              speed: voiceSpeed,
              correctWordCount: voiceWordCount ?? null,
              measuredDurationMs: voiceDurationMs ?? null,
              trainingCount: trainingCount ?? null,
            }),
          )
          .sort((left, right) => left.date.localeCompare(right.date)),
      }
    },
    async getTrainingHistory(studentId, query, options) {
      const today = await resolveReferenceDate(studentId, now, referenceDate, options)
      const { from, to } = resolveTrainingHistoryDateRange(query, today)
      const search = new URLSearchParams({ from, to })
      const result = await request<StudentTrainingHistoryDto>(
        `/api/admin/student/${studentId}/training-history?${search}`,
        { signal: options?.signal },
      )
      return {
        learningHistory: result.learningHistory.map(
          ({
            accuracyRate,
            learningCategory: _learningCategory,
            questions: _questions,
            ...item
          }) => ({
            ...item,
            achievement: accuracyRate,
          }),
        ),
      }
    },
    updateTeacherMemo(studentId, teacherMemo) {
      return request<void>(`/api/admin/student/${studentId}`, {
        method: 'PATCH',
        body: jsonBody({ teacherMemo: teacherMemo ?? '' }),
      })
    },
  }
}
