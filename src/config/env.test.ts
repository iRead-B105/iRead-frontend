import { describe, expect, it } from 'vitest'
import { EnvironmentConfigurationError, resolveEnvironment, type EnvironmentInput } from './env'

const apiEnvironment: EnvironmentInput = {
  VITE_AUTH_SOURCE: 'api',
  VITE_DATA_SOURCE: 'api',
}

describe('resolveEnvironment', () => {
  it('인증 또는 데이터 소스 누락을 거부한다', () => {
    expect(() => resolveEnvironment({})).toThrow(EnvironmentConfigurationError)
    expect(() => resolveEnvironment({ VITE_DATA_SOURCE: 'mock' })).toThrow(
      'VITE_AUTH_SOURCE는 mock 또는 api여야 합니다.',
    )
    expect(() => resolveEnvironment({ VITE_AUTH_SOURCE: 'mock' })).toThrow(
      'VITE_DATA_SOURCE는 mock 또는 api여야 합니다.',
    )
  })

  it('허용되지 않은 인증 또는 데이터 소스를 거부한다', () => {
    expect(() =>
      resolveEnvironment({
        VITE_AUTH_SOURCE: 'fallback',
        VITE_DATA_SOURCE: 'mock',
      }),
    ).toThrow('VITE_AUTH_SOURCE는 mock 또는 api여야 합니다.')
    expect(() =>
      resolveEnvironment({
        VITE_AUTH_SOURCE: 'mock',
        VITE_DATA_SOURCE: 'fallback',
      }),
    ).toThrow('VITE_DATA_SOURCE는 mock 또는 api여야 합니다.')
  })

  it.each([
    ['mock', 'mock'],
    ['api', 'mock'],
    ['api', 'api'],
  ] as const)('개발 환경의 %s/%s 조합을 허용한다', (authSource, dataSource) => {
    expect(
      resolveEnvironment({
        VITE_AUTH_SOURCE: authSource,
        VITE_DATA_SOURCE: dataSource,
      }),
    ).toMatchObject({ authSource, dataSource })
  })

  it('mock/api 조합을 거부한다', () => {
    expect(() =>
      resolveEnvironment({
        VITE_AUTH_SOURCE: 'mock',
        VITE_DATA_SOURCE: 'api',
      }),
    ).toThrow('VITE_AUTH_SOURCE=mock, VITE_DATA_SOURCE=api 조합은 허용되지 않습니다.')
  })

  it('production 환경의 mock 데이터 소스를 거부한다', () => {
    expect(() =>
      resolveEnvironment(
        {
          VITE_AUTH_SOURCE: 'mock',
          VITE_DATA_SOURCE: 'mock',
        },
        {
          isProduction: true,
        },
      ),
    ).toThrow('production build에서는 VITE_AUTH_SOURCE=api, VITE_DATA_SOURCE=api만 허용됩니다.')
  })

  it('production 환경의 api 데이터 소스를 허용한다', () => {
    expect(
      resolveEnvironment(apiEnvironment, {
        isProduction: true,
      }).dataSource,
    ).toBe('api')
  })

  it('빈 API base URL을 same-origin으로 처리한다', () => {
    expect(
      resolveEnvironment({
        ...apiEnvironment,
        VITE_API_BASE_URL: '',
      }).apiBaseUrl,
    ).toBe('')
  })

  it('교차 origin API base URL을 허용한다', () => {
    expect(
      resolveEnvironment({
        ...apiEnvironment,
        VITE_API_BASE_URL: 'https://api.example.com:8443',
      }).apiBaseUrl,
    ).toBe('https://api.example.com:8443')
  })

  it.each([
    'https://api.example.com/',
    'https://api.example.com/api',
    'https://api.example.com?source=test',
    'https://api.example.com#section',
  ])('path, query, hash 또는 trailing slash가 포함된 API base URL을 거부한다: %s', (value) => {
    expect(() =>
      resolveEnvironment({
        ...apiEnvironment,
        VITE_API_BASE_URL: value,
      }),
    ).toThrow('VITE_API_BASE_URL에는 scheme, host와 선택적 port만 지정할 수 있습니다.')
  })

  it('로컬 api 개발에서 Backend origin 누락을 거부한다', () => {
    expect(() =>
      resolveEnvironment(apiEnvironment, {
        requireBackendOrigin: true,
      }),
    ).toThrow('로컬 api 개발에는 VITE_BACKEND_URL이 필요합니다.')
  })

  it('로컬 api 개발에서 Backend origin을 허용한다', () => {
    expect(
      resolveEnvironment(
        {
          ...apiEnvironment,
          VITE_BACKEND_URL: 'http://localhost:8080',
        },
        {
          requireBackendOrigin: true,
        },
      ).backendUrl,
    ).toBe('http://localhost:8080')
  })
})
