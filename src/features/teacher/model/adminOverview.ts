import type { StudentListItemDto, TeacherInfoDto } from '../api/adminOverviewApi'
import type { SessionTeacher } from '@/stores/session'

export interface AdminStudentSummary {
  readonly id: number | null
  readonly name: string
  readonly age: number
  readonly recentLearningDate: string | null
  readonly totalLearningTime: number
  readonly recentTraining: string | null
}

export function toSessionTeacher(dto: TeacherInfoDto): SessionTeacher {
  return {
    name: dto.name,
    email: dto.email,
    organization: dto.organization ?? null,
    gender: dto.gender ?? null,
    profileImageUrl: dto.profileImageUrl ?? null,
  }
}

export function toAdminStudentSummary(
  dto: StudentListItemDto,
  id: number | null,
): AdminStudentSummary {
  const age = Number(dto.age)

  if (!Number.isFinite(age)) {
    throw new TypeError(
      `[교수자 아동 목록] age는 숫자로 변환할 수 있어야 합니다. 현재 값: ${dto.age}`,
    )
  }

  return {
    id,
    name: dto.name,
    age,
    recentLearningDate: dto.lastLearningDate ?? null,
    totalLearningTime: dto.totalLearningTime ?? 0,
    recentTraining: dto.recentTraining ?? null,
  }
}
