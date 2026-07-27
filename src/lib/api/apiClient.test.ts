// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { ApiClient, jsonBody, type FetchImplementation } from './apiClient'
import { ApiError } from './apiError'

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function createFetchMock() {
  return vi.fn<FetchImplementation>()
}

describe('ApiClient', () => {
  it('origin과 /api/... endpoint를 결합하고 data를 반환한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          teacherId: 7,
        },
      }),
    )
    const client = new ApiClient({
      baseUrl: 'https://api.example.com:8443',
      fetch: fetchMock,
    })

    await expect(client.request<{ teacherId: number }>('/api/admin/teacher/info')).resolves.toEqual(
      {
        teacherId: 7,
      },
    )

    const [requestUrl, requestInit] = fetchMock.mock.calls[0]!
    expect(requestUrl).toBe('https://api.example.com:8443/api/admin/teacher/info')
    expect(requestInit?.credentials).toBe('include')
  })

  it('빈 origin은 same-origin endpoint를 그대로 사용한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    const client = new ApiClient({
      fetch: fetchMock,
    })

    await client.request<void>('/api/auth/logout')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        credentials: 'include',
      }),
    )
  })

  it('data가 없는 성공 envelope를 undefined로 반환한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    const client = new ApiClient({ fetch: fetchMock })

    await expect(client.request<void>('/api/test/no-data')).resolves.toBeUndefined()
  })

  it('204 No Content를 undefined로 반환한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const client = new ApiClient({ fetch: fetchMock })

    await expect(client.request<void>('/api/test/no-content')).resolves.toBeUndefined()
  })

  it('body가 비어 있는 성공 응답을 무데이터 성공으로 처리한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    const client = new ApiClient({ fetch: fetchMock })

    await expect(client.request<void>('/api/test/empty')).resolves.toBeUndefined()
  })

  it('공통 성공 envelope가 아니면 INVALID_RESPONSE 오류를 반환한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 1 } }))
    const client = new ApiClient({ fetch: fetchMock })

    await expect(client.request('/api/test/invalid-envelope')).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
      code: 'INVALID_RESPONSE',
    })
  })

  it.each([400, 401, 403, 404, 409, 429, 500])(
    '%i 오류에서 status와 error code·message를 보존한다',
    async (status) => {
      const fetchMock = createFetchMock()
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: `ERROR_${status}`,
              message: `${status} 오류`,
            },
          },
          status,
        ),
      )
      const client = new ApiClient({ fetch: fetchMock })

      await expect(client.request('/api/test/error')).rejects.toMatchObject({
        name: 'ApiError',
        status,
        code: `ERROR_${status}`,
        message: `${status} 오류`,
      })
    },
  )

  it('비 JSON 오류 응답은 HTTP status 기반 fallback 오류로 처리한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(
      new Response('Internal Server Error', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
        },
      }),
    )
    const client = new ApiClient({ fetch: fetchMock })

    await expect(client.request('/api/test/non-json-error')).rejects.toMatchObject({
      status: 500,
      code: 'HTTP_500',
      message: '요청을 처리하지 못했습니다. (500)',
      responseBody: 'Internal Server Error',
    })
  })

  it('JSON 문자열 body에는 Content-Type을 자동 설정한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    const client = new ApiClient({ fetch: fetchMock })

    await client.request<void>('/api/test/json', {
      method: 'POST',
      body: jsonBody({ name: '교수자' }),
    })

    const [, requestInit] = fetchMock.mock.calls[0]!
    const headers = new Headers(requestInit?.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('FormData의 Content-Type은 브라우저가 설정하도록 제거한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    const client = new ApiClient({ fetch: fetchMock })
    const formData = new FormData()
    formData.append('file', new Blob(['data']), 'sample.txt')

    await client.request<void>('/api/test/form-data', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    const [, requestInit] = fetchMock.mock.calls[0]!
    const headers = new Headers(requestInit?.headers)
    expect(headers.has('Content-Type')).toBe(false)
  })

  it('요청에서 credentials를 지정해도 include를 유지한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    const client = new ApiClient({ fetch: fetchMock })

    await client.request<void>('/api/test/cookie', {
      credentials: 'omit',
    })

    const [, requestInit] = fetchMock.mock.calls[0]!
    expect(requestInit?.credentials).toBe('include')
  })

  it('access token 제공자의 값을 Authorization header에 연결한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    const client = new ApiClient({
      fetch: fetchMock,
      getAccessToken: async () => 'access-token',
    })

    await client.request<void>('/api/test/auth')

    const [, requestInit] = fetchMock.mock.calls[0]!
    const headers = new Headers(requestInit?.headers)
    expect(headers.get('Authorization')).toBe('Bearer access-token')
  })

  it('호출자가 설정한 Authorization header를 덮어쓰지 않는다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    const client = new ApiClient({
      fetch: fetchMock,
      getAccessToken: () => 'access-token',
    })

    await client.request<void>('/api/test/auth', {
      headers: {
        Authorization: 'Custom credential',
      },
    })

    const [, requestInit] = fetchMock.mock.calls[0]!
    const headers = new Headers(requestInit?.headers)
    expect(headers.get('Authorization')).toBe('Custom credential')
  })

  it('401 hook을 호출하되 요청을 자동 재시도하지 않는다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: '인증이 필요합니다.',
          },
        },
        401,
      ),
    )
    const onUnauthorized = vi.fn<(error: ApiError) => void>()
    const client = new ApiClient({
      fetch: fetchMock,
      onUnauthorized,
    })

    await expect(client.request('/api/test/unauthorized')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    })
    expect(onUnauthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        code: 'UNAUTHORIZED',
      }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('AbortSignal을 fetch에 전달한다', async () => {
    const fetchMock = createFetchMock()
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    const client = new ApiClient({ fetch: fetchMock })
    const controller = new AbortController()

    await client.request<void>('/api/test/abort-signal', {
      signal: controller.signal,
    })

    const [, requestInit] = fetchMock.mock.calls[0]!
    expect(requestInit?.signal).toBe(controller.signal)
  })

  it('AbortError를 ApiError로 바꾸지 않는다', async () => {
    const fetchMock = createFetchMock()
    const abortError = new DOMException('요청 취소', 'AbortError')
    fetchMock.mockRejectedValue(abortError)
    const client = new ApiClient({ fetch: fetchMock })

    await expect(client.request('/api/test/abort')).rejects.toBe(abortError)
  })

  it('네트워크 오류를 NETWORK_ERROR로 변환한다', async () => {
    const fetchMock = createFetchMock()
    const networkError = new TypeError('fetch failed')
    fetchMock.mockRejectedValue(networkError)
    const client = new ApiClient({ fetch: fetchMock })

    await expect(client.request('/api/test/network')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      originalError: networkError,
    })
  })

  it.each(['/teacher/info', 'https://api.example.com/api/teacher/info'])(
    '/api/... 형식이 아닌 endpoint를 거부한다: %s',
    async (endpoint) => {
      const fetchMock = createFetchMock()
      const client = new ApiClient({ fetch: fetchMock })

      await expect(client.request(endpoint)).rejects.toThrow(
        'endpoint는 /api/... 형식이어야 합니다.',
      )
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )
})
