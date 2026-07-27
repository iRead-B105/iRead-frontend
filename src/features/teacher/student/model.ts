export interface StudentListQuery {
  readonly keyword?: string
  readonly age?: number
  readonly recentDays?: 7 | 30
  readonly page?: number
  readonly size?: number
}

export interface StudentListItem {
  readonly studentId: number
  readonly name: string
  readonly school: string
  readonly age: number
  readonly imageUrl: string | null
  readonly recentTraining: string | null
  readonly recentLearningDate: string | null
  readonly weeklyScheduledCount: number
  readonly weeklyCompletedCount: number
  readonly weeklyParticipationRate: number | null
  readonly totalLearningMinutes: number
}

export interface StudentListResult {
  readonly students: readonly StudentListItem[]
  readonly page: number
  readonly size: number
  readonly totalElements: number
  readonly totalPages: number
}

export interface StudentSummary {
  readonly totalStudents: number
  readonly scheduledTodayCount: number
}

export interface StudentNavigationItem {
  readonly studentId: number
  readonly name: string
  readonly school: string
  readonly imageUrl: string | null
}

export type StudentGender = 'Boy' | 'Girl'

export interface StudentDetail {
  readonly studentId: number
  readonly name: string
  readonly birthday: string
  readonly gender: StudentGender
  readonly school: string
  readonly guardian: string
  readonly guardianContact: string
  readonly guardianEmail: string | null
  readonly address: string | null
  readonly createdAt: string
  readonly imageUrl: string | null
  readonly teacherMemo: string | null
}

export type StudentAttentionReason =
  | 'LOW_ACCURACY'
  | 'GAZE_ANALYSIS_FAILED'
  | 'INACTIVE'
  | 'NO_HISTORY'

export interface StudentLearningSummary {
  readonly studentId: number
  readonly currentStage: string | null
  readonly lastLearningAt: string | null
  readonly attentionRequiredCount: number
  readonly attentionReasons: readonly StudentAttentionReason[]
}

export interface StudentCreateInput {
  readonly name: string
  readonly birthday: string
  readonly gender: StudentGender
  readonly school: string
  readonly guardian: string
  readonly guardianContact: string
  readonly guardianEmail?: string | null
  readonly address?: string | null
}

export interface StudentUpdateInput {
  name?: string
  birthday?: string
  gender?: StudentGender
  school?: string
  guardian?: string
  guardianContact?: string
  guardianEmail?: string | null
  address?: string | null
}

export interface StudentMutationCommand<TInput> {
  readonly input: TInput
  readonly image?: File
}

export type StudentRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export const DEFAULT_STUDENT_PAGE_SIZE = 10

export function toStudentNavigationItem(student: StudentListItem): StudentNavigationItem {
  return {
    studentId: student.studentId,
    name: student.name,
    school: student.school,
    imageUrl: student.imageUrl,
  }
}
