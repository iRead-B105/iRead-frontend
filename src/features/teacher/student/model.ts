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
