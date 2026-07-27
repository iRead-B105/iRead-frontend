# iRead 교수자 Frontend

Vue 3, TypeScript와 Vite 기반의 iRead 교수자용 Frontend입니다.

## 요구 환경

- Node.js `^22.18.0` 또는 `>=24.12.0`
- pnpm `11.9.0`

패키지 설치와 lockfile 변경에는 pnpm만 사용합니다.

## 설치

```bash
pnpm install --frozen-lockfile
```

## 환경변수

`.env.example`을 참고해 Git에 포함되지 않는 `.env.local` 계열 파일이나 실행 환경에 값을 설정합니다.

```env
VITE_AUTH_SOURCE=mock
VITE_DATA_SOURCE=mock
VITE_API_BASE_URL=
VITE_BACKEND_URL=http://localhost:8080
```

- `VITE_AUTH_SOURCE`는 인증에 사용할 `mock` 또는 `api`를 명시해야 합니다.
- `VITE_DATA_SOURCE`는 모든 실행에서 `mock` 또는 `api`를 명시해야 합니다.
- `mock/mock`, `api/mock`, `api/api` 조합을 허용하고 `mock/api`는 거부합니다.
- production build에서는 인증과 기능 데이터 모두 `api`만 허용합니다.
- `VITE_API_BASE_URL`은 API origin만 담당합니다. 빈 값은 same-origin입니다.
- endpoint가 `/api/...` 전체 경로를 포함하므로 `VITE_API_BASE_URL`에 `/api`를 넣지 않습니다.
- 로컬 `api` 개발에서는 Vite proxy 대상인 `VITE_BACKEND_URL`이 필요합니다.
- token, 비밀번호와 비밀키는 `VITE_*` 변수에 저장하지 않습니다.

## 개발 서버

```bash
pnpm dev
```

## 검증

```bash
pnpm test
pnpm type-check
pnpm lint
```

`pnpm lint`는 파일을 수정하지 않습니다. 명시적으로 자동 수정할 때만 다음 명령을 사용합니다.

```bash
pnpm lint:fix
```

production build는 실행 환경에 `VITE_AUTH_SOURCE=api`, `VITE_DATA_SOURCE=api`를 주입한
상태에서 수행합니다.

```bash
pnpm build
```

두 소스가 없거나 하나라도 `mock`이면 production build는 설정 오류로 실패해야 합니다.

## 후속 Repository 이전 대상

FE-001에서는 교수자 정보와 아동 목록 조회를 대표 경로로 이전했습니다. 다음 직접
`mockData.ts` 사용 위치는 각 화면 작업인 FE-003~FE-005에서 Repository로 이전합니다.

- `src/components/teacher/StudentSummaryHeader.vue`
- `src/views/teacher/StudentOverviewView.vue`
- `src/views/teacher/StudentReportView.vue`
