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

## 데모

Frontend 단독 mock과 Backend API 연동의 실행, 초기화, 핵심 시나리오와 실패 복구
절차는 [DEMO.md](./DEMO.md)를 따릅니다.

- mock fixture는 `2026-07-28`을 기준으로 결정적인 결과를 제공합니다.
- mock mutation과 세션은 브라우저 새로고침으로 초기화됩니다.
- API 실패는 mock 데이터로 자동 전환되지 않습니다.
- mock 전체 데모와 Backend API 통합 데모 결과를 구분해 기록합니다.

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
