import type {
  StudentListQuery,
  StudentListResult,
  StudentSummary,
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
}
