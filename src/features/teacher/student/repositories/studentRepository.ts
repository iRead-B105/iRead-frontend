import type {
  StudentCreateInput,
  StudentDetail,
  StudentLearningSummary,
  StudentListQuery,
  StudentListResult,
  StudentMutationCommand,
  StudentSummary,
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
  readonly updateTeacherMemo: (
    studentId: number,
    teacherMemo: string | null,
  ) => Promise<void>
}
