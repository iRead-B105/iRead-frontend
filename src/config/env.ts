export type DataSource = 'mock' | 'api'
export type AuthSource = DataSource

export interface EnvironmentInput {
  readonly VITE_AUTH_SOURCE?: string
  readonly VITE_DATA_SOURCE?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BACKEND_URL?: string
}

export interface EnvironmentValidationOptions {
  readonly isProduction?: boolean
  readonly requireBackendOrigin?: boolean
}

export interface AppEnvironment {
  readonly authSource: AuthSource
  readonly dataSource: DataSource
  readonly apiBaseUrl: string
  readonly backendUrl: string
}

export class EnvironmentConfigurationError extends Error {
  override readonly name = 'EnvironmentConfigurationError'
}

function parseSource(value: string | undefined, variableName: string): DataSource {
  if (value === 'mock' || value === 'api') {
    return value
  }

  const received = value === undefined || value === '' ? '누락' : value
  throw new EnvironmentConfigurationError(
    `[환경설정] ${variableName}는 mock 또는 api여야 합니다. 현재 값: ${received}`,
  )
}

function parseOptionalHttpOrigin(value: string | undefined, variableName: string): string {
  if (value === undefined || value === '') {
    return ''
  }

  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    throw new EnvironmentConfigurationError(
      `[환경설정] ${variableName}은 유효한 HTTP(S) origin이어야 합니다.`,
    )
  }

  const hasUnsupportedPart =
    value !== value.trim() ||
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== '' ||
    value.endsWith('/')

  if (hasUnsupportedPart) {
    throw new EnvironmentConfigurationError(
      `[환경설정] ${variableName}에는 scheme, host와 선택적 port만 지정할 수 있습니다.`,
    )
  }

  return parsed.origin
}

export function resolveEnvironment(
  input: EnvironmentInput,
  options: EnvironmentValidationOptions = {},
): AppEnvironment {
  const authSource = parseSource(input.VITE_AUTH_SOURCE, 'VITE_AUTH_SOURCE')
  const dataSource = parseSource(input.VITE_DATA_SOURCE, 'VITE_DATA_SOURCE')
  const apiBaseUrl = parseOptionalHttpOrigin(input.VITE_API_BASE_URL, 'VITE_API_BASE_URL')
  const backendUrl = parseOptionalHttpOrigin(input.VITE_BACKEND_URL, 'VITE_BACKEND_URL')

  if (authSource === 'mock' && dataSource === 'api') {
    throw new EnvironmentConfigurationError(
      '[환경설정] VITE_AUTH_SOURCE=mock, VITE_DATA_SOURCE=api 조합은 허용되지 않습니다.',
    )
  }

  if (options.isProduction && (authSource !== 'api' || dataSource !== 'api')) {
    throw new EnvironmentConfigurationError(
      '[환경설정] production build에서는 VITE_AUTH_SOURCE=api, VITE_DATA_SOURCE=api만 허용됩니다.',
    )
  }

  if (
    options.requireBackendOrigin &&
    (authSource === 'api' || dataSource === 'api') &&
    backendUrl === ''
  ) {
    throw new EnvironmentConfigurationError(
      '[환경설정] 로컬 api 개발에는 VITE_BACKEND_URL이 필요합니다.',
    )
  }

  return {
    authSource,
    dataSource,
    apiBaseUrl,
    backendUrl,
  }
}
