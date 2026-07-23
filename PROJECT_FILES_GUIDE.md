# t-ui 설정 파일 해설

이 문서는 주석을 직접 넣을 수 없는 JSON 파일과 자동 생성 파일의 역할을 비전공자도 이해할 수 있도록 설명합니다. JSON은 정해진 데이터 형식이라 `// 설명`이나 `/* 설명 */`을 넣으면 일부 도구에서 파일을 읽지 못합니다. 따라서 실행에 영향을 주지 않는 이 문서에서 항목별로 설명합니다.

## `package.json`

프로젝트의 이름, 실행 명령, 사용하는 외부 라이브러리를 기록한 중심 설정 파일입니다. `pnpm install` 같은 패키지 관리 명령은 이 파일을 읽어 필요한 프로그램을 준비합니다.

- `name`: 프로젝트를 구별하는 이름입니다.
- `version`: 현재 프로젝트 버전입니다. `0.0.0`은 아직 정식 배포 버전을 정하지 않은 초기 상태라는 의미로 자주 사용합니다.
- `private`: `true`이면 실수로 npm 공개 저장소에 배포하는 일을 막습니다.
- `type: "module"`: JavaScript와 TypeScript에서 `import`와 `export` 문법을 기본으로 사용합니다.
- `scripts`: 터미널에서 실행할 긴 명령에 짧은 별명을 붙인 영역입니다.
  - `dev`: Vite 개발 서버를 실행합니다. 파일을 저장하면 브라우저 화면이 빠르게 갱신됩니다.
  - `build`: 자료형 검사를 실행하면서 실제 배포 파일도 만듭니다.
  - `preview`: 빌드된 결과를 로컬 서버에서 미리 확인합니다.
  - `build-only`: 자료형 검사를 별도로 하지 않고 Vite 빌드만 실행합니다.
  - `type-check`: `vue-tsc`로 Vue와 TypeScript의 자료형 오류를 검사합니다.
  - `lint`: Oxlint와 ESLint 검사를 순서대로 실행합니다.
  - `lint:oxlint`: 빠른 Oxlint 검사를 하고 가능한 문제는 자동 수정합니다.
  - `lint:eslint`: ESLint로 Vue/TypeScript 규칙을 검사하고 가능한 문제를 자동 수정합니다.
  - `format`: Prettier로 `src` 폴더의 코드 모양을 통일합니다.
- `dependencies`: 실제 앱이 브라우저에서 동작할 때 필요한 라이브러리입니다.
  - `vue`: 화면을 컴포넌트 단위로 만들고 데이터 변경을 화면에 반영하는 핵심 프레임워크입니다.
  - `vue-router`: URL에 따라 표시할 Vue 화면을 바꿉니다.
  - `echarts`: 선 그래프와 막대그래프를 그립니다.
- `devDependencies`: 개발·검사·빌드할 때만 필요한 도구입니다. 배포된 앱의 기능 자체에는 직접 포함되지 않는 경우가 많습니다.
  - `vite`, `@vitejs/plugin-vue`: 개발 서버를 실행하고 Vue 파일을 브라우저용 코드로 묶습니다.
  - `typescript`, `vue-tsc`, `@types/node`: 자료형 오류를 검사하고 Node.js 기능의 자료형 정보를 제공합니다.
  - `eslint`, `oxlint` 및 관련 플러그인: 잘못되거나 위험한 코드 형태를 검사합니다.
  - `prettier`, `eslint-config-prettier`: 코드 들여쓰기와 줄바꿈을 통일하고 ESLint와의 서식 충돌을 막습니다.
  - `vite-plugin-vue-devtools`: 개발 중 Vue 컴포넌트 상태를 브라우저에서 확인하게 합니다.
- `engines.node`: 이 프로젝트를 실행할 수 있는 Node.js 버전 범위입니다.

## `tsconfig.json`

TypeScript 설정의 시작점입니다. 실제 세부 설정을 한 파일에 몰아넣지 않고 실행 환경별 설정을 연결합니다.

- `files: []`: 이 파일이 직접 검사할 개별 소스 파일은 없다는 뜻입니다.
- `references`: TypeScript가 함께 검사할 하위 설정 목록입니다.
  - `tsconfig.node.json`: Vite와 ESLint처럼 Node.js에서 실행되는 설정 코드용입니다.
  - `tsconfig.app.json`: 브라우저에서 실행되는 Vue 애플리케이션 소스용입니다.

## `tsconfig.app.json`

`src` 안의 Vue/TypeScript 앱 코드를 검사하는 규칙입니다. TypeScript 설정 파일은 JSONC 방식도 지원하므로 기존 주석이 있지만, 모든 JSON 해설을 찾기 쉽도록 이 문서에도 정리합니다.

- `extends`: Vue가 제공하는 브라우저용 권장 TypeScript 설정을 기본값으로 물려받습니다.
- `include`: `env.d.ts`, `src` 내부 파일, 모든 `.vue` 파일을 검사 대상에 포함합니다.
- `exclude`: `__tests__` 폴더의 테스트 코드를 현재 검사 대상에서 제외합니다.
- `noUncheckedIndexedAccess`: 배열 번호나 객체 키로 값을 꺼낼 때 값이 없을 가능성도 검사합니다. 코드가 조금 엄격해지지만 오류를 미리 찾는 데 도움이 됩니다.
- `paths`: `@/*`를 `src/*`와 연결합니다. 그래서 긴 상대 경로 대신 `@/components/...`처럼 작성할 수 있습니다.
- `tsBuildInfoFile`: 이전 검사 결과를 임시 파일에 저장해 다음 자료형 검사를 빠르게 합니다.

## `tsconfig.node.json`

브라우저 화면이 아니라 Node.js에서 실행되는 Vite, ESLint, 테스트 도구 설정 파일을 위한 TypeScript 규칙입니다.

- `extends`: Node.js 24 환경의 권장 설정을 물려받습니다.
- `include`: Vite, Vitest, Cypress, Playwright, ESLint 설정 파일 이름을 검사 대상으로 지정합니다. 현재 없는 파일 이름도 나중에 도구를 추가할 수 있도록 미리 포함되어 있습니다.
- `module: "preserve"`: 작성한 모듈 문법을 TypeScript가 임의의 다른 형식으로 바꾸지 않습니다.
- `moduleResolution: "bundler"`: Vite 같은 번들러가 모듈을 찾는 방식에 맞춥니다.
- `types: ["node"]`: 파일 경로와 환경 변수 같은 Node.js 전용 기능의 자료형만 자동 포함합니다.
- `noEmit: true`: 이 설정에서는 JavaScript 파일을 만들지 않고 오류 검사만 합니다.
- `tsBuildInfoFile`: Node 설정 검사 결과의 임시 저장 위치입니다.

## `.oxlintrc.json`

Oxlint라는 빠른 코드 검사기의 설정입니다.

- `$schema`: 편집기가 허용되는 설정 항목을 자동 완성하고 잘못된 값을 표시하도록 Oxlint의 규격 파일을 연결합니다.
- `plugins`: JavaScript, TypeScript, Vue 등 여러 코드 유형에 맞는 검사 규칙 묶음을 활성화합니다.
- `env.browser`: `window`, `document` 같은 브라우저 전용 전역 변수를 정상 코드로 인정합니다.
- `categories.correctness: "error"`: 실제 오동작으로 이어질 가능성이 있는 문제를 오류 수준으로 보고합니다.

## `.prettierrc.json`

Prettier가 코드 모양을 자동 정리할 때 사용하는 규칙입니다.

- `$schema`: 편집기의 설정 자동 완성과 오류 확인을 위한 규격 주소입니다.
- `semi: false`: 문장 끝 세미콜론을 생략하는 스타일을 사용합니다.
- `singleQuote: true`: 가능한 곳에서는 큰따옴표보다 작은따옴표를 사용합니다.
- `printWidth: 100`: 한 줄이 약 100자를 넘으면 읽기 좋게 여러 줄로 나눕니다.

## `pnpm-lock.yaml`

직접 편집하는 설명용 파일이 아니라 패키지 관리자가 자동 생성하는 잠금 파일입니다. 설치된 라이브러리와 그 하위 라이브러리의 정확한 버전을 기록하여 다른 컴퓨터에서도 같은 개발 환경을 재현하게 합니다. 주석이나 수동 변경을 추가하면 다음 설치 과정에서 사라지거나 의존성 설치가 달라질 수 있으므로 수정하지 않습니다.

## `dist`와 `node_modules`

- `dist`: `pnpm build` 결과로 생성되는 배포용 파일입니다. 원본 소스가 아니며 다음 빌드 때 다시 만들어지므로 주석을 추가하지 않습니다.
- `node_modules`: 외부 라이브러리가 설치되는 폴더입니다. 프로젝트가 직접 관리하는 코드가 아니고 재설치하면 교체되므로 수정하지 않습니다.
