import type { StudentListDto, StudentListItemDto, TeacherInfoDto } from '../api/adminOverviewApi'
import type { ErrorResponse, SuccessResponseWithData } from '@/lib/api'

export interface StudentListFixtureItem extends StudentListItemDto {
  readonly fixtureId: number
}

export const teacherInfoFixture: TeacherInfoDto = {
  name: '이OO 선생님',
  organization: 'iRead 학습센터',
  email: 'teacher@example.com',
  gender: 'FEMALE',
  profileImageUrl: '/images/teacher-profile.png',
}

const contractStudentItems: readonly StudentListItemDto[] = [
  {
    name: '김OO',
    age: '10',
    lastLearningDate: '2026-07-18',
    totalLearningTime: 780,
    recentTraining: '문장 이해력 향상',
  },
  {
    name: '박OO',
    age: '12',
    lastLearningDate: '2026-07-17',
    totalLearningTime: 1980,
    recentTraining: '문장 이해력 향상',
  },
  {
    name: '이OO',
    age: '8',
    lastLearningDate: '2026-07-19',
    totalLearningTime: 1260,
    recentTraining: '낱말 유창성 훈련',
  },
  {
    name: '최OO',
    age: '11',
    lastLearningDate: '2026-07-16',
    totalLearningTime: 1020,
    recentTraining: '핵심 내용 찾기',
  },
  {
    name: '정OO',
    age: '9',
    lastLearningDate: '2026-07-20',
    totalLearningTime: 1560,
    recentTraining: '문장 억양과 끊어 읽기',
  },
]

export const studentListFixture: { readonly students: readonly StudentListFixtureItem[] } = {
  students: contractStudentItems.map((student, index) => ({
    ...student,
    fixtureId: index + 1,
  })),
}

export const teacherInfoSuccessFixture: SuccessResponseWithData<TeacherInfoDto> = {
  success: true,
  data: teacherInfoFixture,
}

export const studentListSuccessFixture: SuccessResponseWithData<StudentListDto> = {
  success: true,
  data: {
    students: contractStudentItems,
  },
}

export const studentListEmptyFixture: SuccessResponseWithData<StudentListDto> = {
  success: true,
  data: {
    students: [],
  },
}

export const resourceNotFoundFixture: ErrorResponse = {
  error: {
    code: 'RESOURCE_NOT_FOUND',
    message: '리소스를 찾을 수 없습니다.',
  },
}

export const serverErrorFixture: ErrorResponse = {
  error: {
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버 오류가 발생했습니다.',
  },
}
