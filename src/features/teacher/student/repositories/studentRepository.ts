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
  StudentSummary,
  StudentTrainingHistory,
  StudentTrainingHistoryPeriod,
  StudentUpdateInput,
} from '../model'

export interface StudentRequestOptions {
  readonly signal?: AbortSignal
}

export interface StudentRepository {
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
  readonly getReadingSpeedTrend: (
    studentId: number,
    options?: StudentRequestOptions,
  ) => Promise<StudentReadingSpeedTrend>
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
