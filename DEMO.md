# 교수자 Frontend 데모 실행

이 문서는 교수자 Frontend의 mock 데모와 Backend 연동 데모를 같은 화면과 route에서
재현하기 위한 실행·초기화·복구 절차다.

## 확인 기준

- Frontend 기준: `feature/fe-012`의 `1d3bbff`
- Frontend mock 기준 시각: `2026-07-28T09:00:00+09:00`
- 연결된 Backend 로컬 `develop`: `6e2d472`
- 확인한 Backend 원격 `develop`: `c8bea48`

Backend 로컬 checkout은 원격보다 이전 상태다. 이 문서 작성 중에는 읽기 전용 범위를
지키기 위해 Backend를 fetch, pull 또는 수정하지 않았다.

## 실행 모드

| 인증   | 기능 데이터 | 용도                                        | 상태      |
| ------ | ----------- | ------------------------------------------- | --------- |
| `mock` | `mock`      | Frontend 단독 전체 시연                     | 지원      |
| `api`  | `mock`      | Backend 인증과 Frontend fixture의 분리 점검 | 지원      |
| `api`  | `api`       | Backend 통합 시연                           | 부분 지원 |
| `mock` | `api`       | 인증 주체가 다른 잘못된 조합                | 실행 거부 |

production build는 `api/api`만 허용한다. API 요청 실패를 mock 데이터로 자동
전환하지 않는다.

## 준비

```powershell
pnpm install --frozen-lockfile
```

로컬 설정은 Git에 포함하지 않는 `.env.local` 또는 현재 shell 환경변수에 둔다.
token, 비밀번호와 비밀키를 `VITE_*` 환경변수에 저장하지 않는다.

### Frontend 단독 mock

```powershell
$env:VITE_AUTH_SOURCE='mock'
$env:VITE_DATA_SOURCE='mock'
$env:VITE_API_BASE_URL=''
pnpm.cmd dev
```

1. `/login`을 연다.
2. `목업 화면으로 입장`을 선택한다.
3. `Backend와 연동 전 입니다.` 안내가 계속 보이는지 확인한다.

일반 로그인 입력은 mock 인증에서 사용하지 않는다.

### Backend API 연동

same-origin Vite proxy를 사용하는 예:

```powershell
$env:VITE_AUTH_SOURCE='api'
$env:VITE_DATA_SOURCE='api'
$env:VITE_API_BASE_URL=''
$env:VITE_BACKEND_URL='http://127.0.0.1:8080'
pnpm.cmd dev
```

교차 origin API를 직접 호출한다면 `VITE_API_BASE_URL`에는 `/api`를 제외한
HTTP(S) origin만 지정한다.

## Mock 시작 상태

mock Repository는 다음 상태를 매 새로고침마다 새로 만든다.

| 목적                     | 시작 fixture                                 |
| ------------------------ | -------------------------------------------- |
| 교수자                   | `teacher@example.com`, `이OO 선생님`         |
| 전체 흐름 대표 학습자    | `김하늘`                                     |
| 빈 상태 학습자           | `박서아`                                     |
| 훈련 시선 상태           | `901` AVAILABLE, `902` NO_DATA, `903` FAILED |
| 검사 비교                | `1011` 기준, `1008` 비교                     |
| 검사 시선 실패           | `1005` FAILED                                |
| 기본 보고서              | `1002`                                       |
| 보고서 시선 빈 상태·실패 | `1001`                                       |

식별자는 mock fixture를 확인하기 위한 값이다. API mode의 고정 ID로 사용하지 않는다.

mock 데이터는 메모리에만 저장된다.

- 등록·수정·삭제 결과는 현재 탭에서 유지된다.
- 브라우저 새로고침은 모든 mock mutation을 초기 fixture로 되돌린다.
- mock 세션도 초기화되므로 로그인 화면에서 다시 입장한다.
- 같은 시작 상태가 필요하면 서버나 파일을 삭제하지 말고 새로고침한다.

## Mock 핵심 시나리오

항상 초기 상태에서 시작한다.

1. `/login`에서 목업 화면으로 입장한다.
2. 대시보드에서 `김하늘`을 검색하고 선택한다.
3. 학습 현황에서 요약, 최근 학습, 정확도 추이와 교수자 메모를 확인한다.
4. 커리큘럼에서 훈련 순서를 바꾸고 예상 단어를 추가·삭제한 뒤 저장한다.
5. 훈련 이력에서 최근 커리큘럼과 통계를 확인한다.
6. 훈련 `901`, `902`, `903`을 차례로 선택해 시선 분석의 세 상태를 확인한다.
7. 검사 `1011`을 기준으로 `1008`을 비교하고 `1005`의 시선 실패 상태를 확인한다.
8. 보고서 `1002`와 `1001`을 선택해 일반·빈 데이터·실패 상태를 확인한다.
9. `2026-07-03`부터 `2026-07-24`까지 새 보고서를 생성하고 교수자 의견을 저장한다.
10. 프로필 이름·소속과 이미지 preview를 변경한다.
11. 로그아웃한 뒤 다시 입장해 초기 상태가 복구되었는지 확인한다.

빈 결과는 `박서아`를 선택해 커리큘럼·훈련·검사·보고서 화면에서 확인한다.

## 오류와 중단 복구

### 잘못된 학습자 route

1. 인증된 상태에서 `/teacher/students/999999`로 이동한다.
2. `404` 상태와 목록 복귀 action을 확인한다.
3. 목록으로 돌아가 대표 학습자를 다시 선택한다.

### 네트워크 중단

네트워크 중단은 API mode에서만 확인한다.

1. 브라우저 개발자 도구에서 네트워크를 Offline으로 전환한다.
2. 조회 또는 저장을 실행해 공통 오류 안내가 표시되는지 확인한다.
3. 네트워크를 Online으로 복구한다.
4. 화면의 대상이 명시된 재시도 action을 실행한다.
5. 같은 화면에서 데이터가 복구되는지 확인한다.

API 실패 후 화면이 mock 데이터로 바뀌면 실패다.

### 인증 만료

1. API mode에서 access token이 만료된 상태로 보호 API를 호출한다.
2. refresh 성공 시 원래 요청이 한 번만 재시도되는지 확인한다.
3. refresh 실패 시 안전한 `redirect` query와 함께 로그인으로 이동하는지 확인한다.
4. 재로그인 후 보호 route로 복귀하고 다른 교수자의 Store 상태가 남지 않았는지 확인한다.

## Backend 통합 범위

Backend 원격 `c8bea48`에는 다음 데모 기반이 있다.

- `DEMO.md`
- `application-demo.properties`
- Flyway demo V2 seed
- 비식별 교수자 `demo@iread.local`
- 비식별 학습자 `샛별`
- 결정적 훈련·Story·STT·TTS fixture

Backend 실행과 DB 초기화는 해당 Backend commit의 `DEMO.md`를 기준으로 한다.
Frontend에는 Backend의 DB 계정, JWT secret 또는 파일 초기화 명령을 복사하지 않는다.

현재 원격 seed에는 진행 전 커리큘럼·검사와 완료 Story가 있지만 교수자 전체 시나리오에
필요한 완료 훈련 이력, 완료 검사 비교, 시선 분석과 기간 보고서 데이터는 충분하지 않다.

`[BLOCKED]` 다음 조건을 충족하기 전에는 API 전체 데모 완료로 표시하지 않는다.

- 읽기 전용 Backend 로컬 checkout을 소유자가 원격 기준으로 동기화
- 빈 demo DB에서 Backend `DEMO.md` 절차 재현
- 교수자 Admin API의 학생·커리큘럼·이력·검사·보고서·프로필 응답 확인
- 완료 이력·시선·보고서가 필요한 단계의 seed 또는 재현 절차 확인
- 로그아웃·재로그인 후 mutation 유지 확인

mock 전체 데모 성공과 API 통합 데모 성공은 별도로 기록한다.

## 수동 체크리스트

### 시작과 데이터

- [ ] mock 환경변수 두 값이 모두 명시되었다.
- [ ] mock 안내가 보호 화면에 계속 보인다.
- [ ] 새로고침 후 fixture와 mock 세션이 초기화된다.
- [ ] 실제 개인정보·실제 사용자 파일을 사용하지 않는다.
- [ ] API 실패가 mock 데이터로 전환되지 않는다.

### 핵심 흐름

- [ ] 학생 검색·선택
- [ ] 학생 개요·교수자 메모
- [ ] 커리큘럼 편성·저장
- [ ] 훈련 이력·통계·시선 상태
- [ ] 검사 선택·비교·시선 상태
- [ ] 보고서 생성·조회·의견 저장
- [ ] 프로필 본문·이미지 preview
- [ ] 로그아웃·재입장

### 대체 상태와 복구

- [ ] 학생·훈련·검사·보고서 빈 상태
- [ ] 시선 `NO_DATA`
- [ ] 시선 `FAILED`
- [ ] 잘못된 학습자 `404`
- [ ] 네트워크 오류·재시도
- [ ] 인증 만료·재로그인
- [ ] 중단된 단계부터 다시 진행

### 최종 검증

```powershell
pnpm.cmd test
pnpm.cmd type-check
pnpm.cmd lint

$env:VITE_AUTH_SOURCE='api'
$env:VITE_DATA_SOURCE='api'
$env:VITE_API_BASE_URL='https://api.example.com'
pnpm.cmd build
```

검증 결과에는 mock 완료 범위, API 완료 범위, 실행하지 못한 수동 항목과
`[BLOCKED]` 사유를 함께 기록한다.

## FE-012-03 검증 기록

기준일: 2026-07-28

| 항목                               | 결과                                               |
| ---------------------------------- | -------------------------------------------------- |
| 전체 Vitest                        | 통과 — 54개 파일, 358개 테스트                     |
| TypeScript type-check              | 통과                                               |
| oxlint·ESLint                      | 통과                                               |
| API 환경 production build          | 통과                                               |
| mock 입장·검색·대표 학습자 이동    | 통과                                               |
| 커리큘럼·훈련·검사·보고서 route    | 통과                                               |
| 훈련 시선 AVAILABLE·NO_DATA·FAILED | 통과                                               |
| 검사 비교·시선 FAILED              | 통과                                               |
| 보고서 생성·새로고침 초기화        | 통과                                               |
| 빈 보고서·잘못된 학습자 404 복구   | 통과                                               |
| mock 로그아웃                      | 통과                                               |
| API 네트워크 중단·재인증           | `[BLOCKED]` — Backend 로컬 checkout 동기화 필요    |
| API 전체 교수자 시나리오           | `[BLOCKED]` — 완료 이력·시선·보고서 seed 확인 필요 |

production build의 기존 `ChartPanel` 청크 크기 경고는 유지된다. 기능 실패나 build
실패는 아니며 FE-012-03에서 새 chart 의존성을 추가하지 않았다.
