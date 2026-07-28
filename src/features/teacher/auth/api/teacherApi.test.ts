import { describe, expect, it, vi } from 'vitest'
import { createTeacherApi, type TeacherRequest } from './teacherApi'

const response = {
  email: 'teacher@example.com',
  name: '이선생',
  organization: null,
  gender: 'FEMALE' as const,
  profileImageUrl: '/images/teacher.png',
}

describe('teacher api', () => {
  it('프로필 수정 PATCH에는 계약 필드만 JSON으로 보낸다', async () => {
    const request = vi.fn().mockResolvedValue(response)
    const api = createTeacherApi(request as TeacherRequest)

    await api.updateProfile({
      name: '박선생',
      organization: null,
      gender: 'MALE',
    })

    expect(request).toHaveBeenCalledWith('/api/admin/teacher/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        name: '박선생',
        organization: null,
        gender: 'MALE',
      }),
    })
    expect(JSON.parse(request.mock.calls[0]?.[1]?.body as string)).not.toHaveProperty('email')
  })

  it('프로필 사진 PATCH는 image part만 FormData로 보내고 Content-Type을 직접 지정하지 않는다', async () => {
    const request = vi.fn().mockResolvedValue(response)
    const api = createTeacherApi(request as TeacherRequest)
    const image = new File(['image'], 'teacher.png', { type: 'image/png' })

    await api.updateProfileImage(image)

    const init = request.mock.calls[0]?.[1]
    expect(request.mock.calls[0]?.[0]).toBe('/api/admin/teacher/profile/image')
    expect(init?.method).toBe('PATCH')
    expect(init?.headers).toBeUndefined()
    const formData = init?.body
    expect(formData).toBeInstanceOf(FormData)
    if (!(formData instanceof FormData)) throw new Error('FormData 요청이 아닙니다.')
    expect(formData.get('image')).toBe(image)
  })

  it('선택 응답 필드가 없으면 null로 정규화한다', async () => {
    const request = vi.fn().mockResolvedValue({
      email: 'teacher@example.com',
      name: '이선생',
    })

    await expect(createTeacherApi(request as TeacherRequest).getInfo()).resolves.toEqual({
      email: 'teacher@example.com',
      name: '이선생',
      organization: null,
      gender: null,
      profileImageUrl: null,
    })
  })
})
