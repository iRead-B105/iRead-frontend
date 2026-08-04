# iRead 교수자 Frontend

Vue 3, TypeScript, Vite 기반의 iRead 교수자용 웹 애플리케이션입니다. 런타임 데이터 소스는 Backend API로 단일화되어 있습니다.

## 요구 환경

- Node.js `^22.18.0` 또는 `>=24.12.0`
- pnpm `11.9.0`

패키지 설치와 lockfile 변경에는 pnpm만 사용합니다.

```bash
pnpm install --frozen-lockfile
```

## 로컬 실행

Backend를 `http://localhost:8080`에서 실행한 뒤 Frontend 개발 서버를 시작합니다.

```bash
pnpm dev
```

브라우저의 API 요청은 항상 same-origin 상대 경로인 `/api/...`를 사용합니다. 로컬 개발에서는 Vite가 `/api`와 `/uploads` 요청을 `http://localhost:8080`으로 전달합니다. 별도의 `.env` 파일이나 `VITE_*` 설정은 사용하지 않습니다.

Backend 주소를 바꿔야 하는 요구가 생기면 그 시점에 개발 프록시 설정 또는 배포 프록시 설정을 추가합니다. 토큰, 비밀번호, 비밀키는 Frontend 환경 변수에 저장하지 않습니다.

## 배포

```bash
pnpm build
```

생성된 정적 파일을 웹 서버에 배포하고, 동일 origin의 `/api`와 `/uploads`를 Backend로 reverse proxy 합니다. 이 구성은 Frontend 빌드에 Backend 주소를 주입하지 않으므로 개발·검증·운영 환경 전환 시 소스 수정과 재빌드를 최소화합니다.

자세한 연동 점검 절차는 [DEMO.md](./DEMO.md)를 참고합니다.

## 검증

```bash
pnpm test
pnpm type-check
pnpm lint
pnpm build
```

`pnpm lint`는 파일을 수정하지 않습니다. 자동 수정이 필요한 경우에만 `pnpm lint:fix`를 사용합니다.
