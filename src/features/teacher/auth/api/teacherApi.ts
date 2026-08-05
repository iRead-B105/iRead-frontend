import { apiRequest, jsonBody } from '@/lib/api'
import type { TeacherGender, TeacherProfile } from '../model'
import type { TeacherProfileUpdateInput } from '../profileValidation'

export type TeacherRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>

interface TeacherProfileDto {
  readonly email: string
  readonly name: string
  readonly organization?: string | null
  readonly gender?: TeacherGender | null
  readonly profileImageUrl?: string | null
}

export interface TeacherApi {
  readonly getInfo: () => Promise<TeacherProfile>
  readonly updateProfile: (input: TeacherProfileUpdateInput) => Promise<TeacherProfile>
  readonly updateProfileImage: (image: File) => Promise<TeacherProfile>
}

function mapTeacherProfile(dto: TeacherProfileDto): TeacherProfile {
  if (dto.gender !== undefined && dto.gender !== null && !['MALE', 'FEMALE'].includes(dto.gender)) {
    throw new Error('[교수자 프로필] 지원하지 않는 성별 응답입니다.')
  }

  return {
    email: dto.email,
    name: dto.name,
    organization: dto.organization ?? null,
    gender: dto.gender ?? null,
    profileImageUrl: dto.profileImageUrl ?? null,
  }
}

export function createTeacherApi(request: TeacherRequest = apiRequest): TeacherApi {
  return {
    getInfo: async () =>
      mapTeacherProfile(await request<TeacherProfileDto>('/api/admin/teacher/info')),
    updateProfile: async (input) =>
      mapTeacherProfile(
        await request<TeacherProfileDto>('/api/admin/teacher/profile', {
          method: 'PATCH',
          body: jsonBody(input),
        }),
      ),
    updateProfileImage: async (image) => {
      const formData = new FormData()
      formData.append('image', image)
      return mapTeacherProfile(
        await request<TeacherProfileDto>('/api/admin/teacher/profile/image', {
          method: 'PATCH',
          body: formData,
        }),
      )
    },
  }
}
