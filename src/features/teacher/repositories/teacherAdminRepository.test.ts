// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { createApiClient, type FetchImplementation } from '@/lib/api'
import { studentListSuccessFixture, teacherInfoSuccessFixture } from '../fixtures/adminOverview'
import { createAdminOverviewApi } from '../api/adminOverviewApi'
import { ApiTeacherAdminRepository } from './apiTeacherAdminRepository'
import { MockTeacherAdminRepository } from './mockTeacherAdminRepository'
import { createTeacherAdminRepository, type TeacherAdminRepositoryOptions } from '.'
import type { DataSource } from '@/config/env'
import type { TeacherAdminRepository } from './teacherAdminRepository'

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function repositoryStub(): TeacherAdminRepository {
  return {
    getTeacherInfo: vi.fn(),
    listStudents: vi.fn(),
    logout: vi.fn(),
  }
}

describe('teacher admin Repository 선택', () => {
  it('mock에서 Mock Repository를 선택한다', () => {
    const mock = repositoryStub()
    const api = repositoryStub()

    expect(createTeacherAdminRepository('mock', { mock, api })).toBe(mock)
  })

  it('api에서 API Repository를 선택한다', () => {
    const mock = repositoryStub()
    const api = repositoryStub()

    expect(createTeacherAdminRepository('api', { mock, api })).toBe(api)
  })

  it('허용되지 않는 데이터 소스를 기본 mock으로 처리하지 않는다', () => {
    expect(() =>
      createTeacherAdminRepository(
        'fallback' as DataSource,
        {} satisfies TeacherAdminRepositoryOptions,
      ),
    ).toThrow('지원하지 않는 값입니다: fallback')
  })

  it('API 실패를 mock 응답으로 대체하지 않는다', async () => {
    const apiError = new Error('API 연결 실패')
    const api = repositoryStub()
    const mock = repositoryStub()
    vi.mocked(api.getTeacherInfo).mockRejectedValue(apiError)
    vi.mocked(mock.getTeacherInfo).mockResolvedValue({
      name: 'mock 교수자',
      email: 'mock@example.com',
      organization: null,
      gender: null,
      profileImageUrl: null,
    })
    const repository = createTeacherAdminRepository('api', { api, mock })

    await expect(repository.getTeacherInfo()).rejects.toBe(apiError)
    expect(mock.getTeacherInfo).not.toHaveBeenCalled()
  })
})

describe('ApiTeacherAdminRepository', () => {
  it('계약 endpoint를 호출하고 교수자·아동 응답을 화면 경계 모델로 변환한다', async () => {
    const fetchMock = vi.fn<FetchImplementation>()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(teacherInfoSuccessFixture))
      .mockResolvedValueOnce(jsonResponse(studentListSuccessFixture))
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchMock,
    })
    const repository = new ApiTeacherAdminRepository(
      createAdminOverviewApi(client.request.bind(client)),
    )

    await expect(repository.getTeacherInfo()).resolves.toMatchObject({
      name: teacherInfoSuccessFixture.data.name,
      profileImageUrl: teacherInfoSuccessFixture.data.profileImageUrl,
    })
    const students = await repository.listStudents()

    expect(students[0]).toMatchObject({
      id: null,
      name: studentListSuccessFixture.data.students[0]!.name,
      age: 10,
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/api/admin/teacher/info',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/api/admin/student/list',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('계약에 없는 Backend 전용 아동 id를 읽지 않는다', async () => {
    const fetchMock = vi.fn<FetchImplementation>().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          students: [
            {
              id: 99,
              name: '계약 아동',
              age: '9',
            },
          ],
        },
      }),
    )
    const client = createApiClient({ fetch: fetchMock })
    const repository = new ApiTeacherAdminRepository(
      createAdminOverviewApi(client.request.bind(client)),
    )

    await expect(repository.listStudents()).resolves.toEqual([
      expect.objectContaining({
        id: null,
        name: '계약 아동',
      }),
    ])
  })
})

describe('MockTeacherAdminRepository', () => {
  it('fixture 전용 식별자를 사용하고 호출마다 새 결과를 반환한다', async () => {
    const repository = new MockTeacherAdminRepository()
    const first = await repository.listStudents()
    const second = await repository.listStudents()

    expect(first[0]).toMatchObject({
      id: 1,
      age: 10,
    })
    expect(first).not.toBe(second)
    expect(first[0]).not.toBe(second[0])
  })
})
