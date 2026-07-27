import { describe, expect, it, vi } from 'vitest'
import { createStudentApi } from './api'

describe('Student API', () => {
  it('상세 조회 응답의 id를 studentId 계약으로 정규화한다', async () => {
    const request = vi.fn().mockResolvedValue({
      id: 7,
      name: '김하늘',
      birthday: '2018-03-15',
      gender: 'Boy',
      school: '새봄초등학교',
      guardian: '김보호',
      guardianContact: '010-0000-0000',
      guardianEmail: null,
      address: null,
      imageUrl: null,
      teacherMemo: null,
    })
    const api = createStudentApi(request)

    await expect(api.getDetail(7)).resolves.toMatchObject({
      studentId: 7,
      createdAt: '',
    })
    expect(request).toHaveBeenCalledWith('/api/admin/student/7', {
      signal: undefined,
    })
  })

  it('이미지가 없는 등록은 JSON body로 요청한다', async () => {
    const request = vi.fn().mockResolvedValue({ studentId: 13 })
    const api = createStudentApi(request)
    const input = {
      name: '새아동',
      birthday: '2019-01-02',
      gender: 'Girl' as const,
      school: '새봄초등학교',
      guardian: '보호자',
      guardianContact: '010-1234-5678',
      guardianEmail: null,
      address: null,
    }

    await expect(api.create({ input })).resolves.toBe(13)
    expect(request).toHaveBeenCalledWith('/api/admin/student', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  })

  it('이미지가 있는 등록은 request JSON Blob과 image만 담은 multipart로 요청한다', async () => {
    const request = vi.fn().mockResolvedValue({ studentId: 13 })
    const api = createStudentApi(request)
    const input = {
      name: '새아동',
      birthday: '2019-01-02',
      gender: 'Girl' as const,
      school: '새봄초등학교',
      guardian: '보호자',
      guardianContact: '010-1234-5678',
    }
    const image = new File(['image'], 'profile.png', { type: 'image/png' })

    await api.create({ input, image })

    const init = request.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.headers).toBeUndefined()
    expect(init.body).toBeInstanceOf(FormData)
    const body = init.body as FormData
    expect(await (body.get('request') as Blob).text()).toBe(JSON.stringify(input))
    expect(body.get('image')).toBe(image)
  })

  it('수정은 변경 필드만 JSON으로 PATCH하고 null 초기화를 보존한다', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const api = createStudentApi(request)

    await api.update(7, {
      input: {
        school: '푸른초등학교',
        guardianEmail: null,
      },
    })

    expect(request).toHaveBeenCalledWith('/api/admin/student/7', {
      method: 'PATCH',
      body: JSON.stringify({
        school: '푸른초등학교',
        guardianEmail: null,
      }),
    })
  })

  it('삭제는 대상 id의 DELETE endpoint를 사용한다', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const api = createStudentApi(request)

    await api.remove(7)

    expect(request).toHaveBeenCalledWith('/api/admin/student/7', {
      method: 'DELETE',
    })
  })
})
