# t-ui 프론트엔드 개발 통합 가이드

> 대상: HTML, CSS, JavaScript를 처음 배우면서 이 프로젝트의 Vue 화면을 직접 수정하고 싶은 사람  
> 기준 프로젝트: Vue 3 + TypeScript + Vue Router + Vite + ECharts  
> 문서 목표: 코드를 복사하는 데서 끝나지 않고, 코드를 읽고 작은 화면부터 직접 만들 수 있게 하는 것

---

## 목차

- 기초 준비: 0~3장
- HTML·JavaScript·TypeScript 기초: 4~7장
- Vue 핵심 문법: 8~14장
- CSS와 현재 디자인 시스템: 15~18장
- API·폼·검색·차트·브라우저 기능: 19~23장
- 직접 만드는 단계별 실습: 24~26장
- 작업 절차·디버깅·품질 관리: 27~30장
- 빠른 참고표·용어·공식 자료: 31~34장

문서 검색 기능에서 `## 19. 서버 API 연결 준비`처럼 장 번호나 `v-model`, `Grid`, `오류` 같은 키워드를 검색하면 필요한 내용을 빠르게 찾을 수 있다.

---

## 0. 이 문서를 사용하는 방법

처음부터 모든 문법을 외우려고 하지 않는다. 다음 순서로 반복하는 것이 가장 효율적이다.

1. 만들려는 화면과 가장 비슷한 기존 Vue 파일을 찾는다.
2. 이 문서에서 해당 문법의 의미를 확인한다.
3. 작은 단위로 코드를 작성한다.
4. 브라우저에서 확인한다.
5. 타입 검사와 린트를 실행한다.
6. 오류 메시지의 첫 번째 오류부터 해결한다.

권장 학습 순서는 다음과 같다.

- 1단계: 1~7장을 읽고 기존 화면의 문구와 간단한 데이터를 변경한다.
- 2단계: 8~18장을 읽고 Vue 컴포넌트, 라우터, CSS를 수정한다.
- 3단계: 19~23장을 읽고 API, 폼, 검색, 차트를 연결한다.
- 4단계: 24~26장의 실습을 직접 완성한다.
- 막힐 때: 27~32장의 작업 절차, 오류 해결, 빠른 참고표를 이용한다.

이 문서의 코드는 작은 예제이므로 실제 기능을 만들 때는 한 파일에 모두 넣지 않는다. 이 프로젝트처럼 화면은 `views`, 재사용 UI는 `components`, 재사용 로직은 `composables`, 자료형은 `types`, 서버 통신은 `services`로 분리한다.

---

## 1. 프론트엔드가 하는 일

웹 애플리케이션의 프론트엔드는 사용자가 브라우저에서 보고 조작하는 부분이다.

- HTML: 화면의 의미와 구조를 만든다.
- CSS: 크기, 색상, 간격, 배치를 정한다.
- JavaScript: 버튼 클릭, 데이터 계산, 서버 통신 같은 동작을 처리한다.
- TypeScript: JavaScript 데이터의 모양을 미리 검사하여 실수를 줄인다.
- Vue: 데이터와 HTML을 연결하고 화면을 컴포넌트 단위로 관리한다.
- Vue Router: URL과 Vue 화면을 연결한다.
- Vite: 개발 서버를 실행하고 배포 파일을 만든다.
- ECharts: 학습 결과를 선 그래프와 막대그래프로 시각화한다.

### 1.1 화면이 열리는 순서

이 프로젝트에서는 다음 순서로 앱이 시작된다.

```text
index.html
  └─ <div id="app">
       └─ src/main.ts
            ├─ 공통 CSS 등록
            ├─ App.vue로 Vue 앱 생성
            └─ router 등록
                 └─ 현재 URL에 맞는 레이아웃과 View 표시
```

예를 들어 `/teacher/students/1/report`로 이동하면 다음 구조가 중첩된다.

```text
App.vue
└─ TeacherLayout.vue
   ├─ TeacherHeader.vue
   ├─ TeacherSidebar.vue
   └─ StudentManagementLayout.vue
      ├─ StudentSummaryHeader.vue
      ├─ StudentTabs.vue
      └─ StudentReportView.vue
```

화면에 문제가 있을 때는 가장 바깥 레이아웃부터 안쪽 View까지 어느 파일이 해당 부분을 담당하는지 먼저 찾는다.

---

## 2. 개발 환경과 기본 명령어

터미널 위치는 `t-ui` 폴더여야 한다.

```powershell
cd C:\Users\rapal\Desktop\UI-mockups\t-ui
```

### 2.1 자주 사용하는 명령어

```powershell
# 필요한 라이브러리 설치
pnpm install

# 개발 서버 실행
pnpm dev

# Vue와 TypeScript 자료형 검사
pnpm type-check

# 코드 규칙 검사 및 가능한 항목 자동 수정
pnpm lint

# 코드 들여쓰기와 줄바꿈 정리
pnpm format

# 자료형 검사와 배포 빌드
pnpm build

# 만들어진 dist 결과 미리보기
pnpm preview
```

PowerShell 실행 정책 때문에 `pnpm`이 실행되지 않으면 `pnpm.cmd dev`처럼 `.cmd`를 붙일 수 있다.

### 2.2 명령어를 실행하는 시점

- 개발 중: `pnpm dev`를 계속 실행해 둔다.
- 기능 하나를 완성했을 때: `pnpm type-check`
- 커밋하거나 다른 사람에게 전달하기 전: `pnpm lint`, `pnpm build`
- 화면만 보인다고 완료가 아니다. 콘솔 오류, 키보드 조작, 빈 데이터 상태도 확인한다.

### 2.3 직접 수정하지 않는 폴더

- `node_modules`: 설치된 외부 라이브러리다. 수정해도 재설치하면 사라진다.
- `dist`: 빌드 결과다. 원본은 `src`이므로 다음 빌드 때 덮어쓴다.
- `pnpm-lock.yaml`: 패키지의 정확한 버전을 고정하는 자동 관리 파일이다.

---

## 3. 현재 프로젝트 구조

```text
t-ui/
├─ public/
│  └─ images/                  # 주소를 /images/...로 사용하는 정적 이미지
├─ src/
│  ├─ assets/
│  │  ├─ base.css              # 가장 기본적인 브라우저 공통 규칙
│  │  └─ main.css              # 디자인 변수와 공통 UI 클래스
│  ├─ components/
│  │  ├─ common/               # 여러 기능에서 재사용하는 범용 UI
│  │  └─ teacher/              # 교수자 기능에서 재사용하는 UI
│  ├─ composables/             # 상태를 포함한 재사용 로직
│  ├─ features/teacher/
│  │  ├─ mockData.ts           # 서버 대신 사용하는 예시 데이터
│  │  └─ types.ts              # Student 등의 데이터 설계도
│  ├─ layouts/                 # 여러 페이지가 공유하는 큰 화면 골격
│  ├─ router/                  # URL과 View의 연결 규칙
│  ├─ views/teacher/           # URL 하나에 대응하는 실제 페이지
│  ├─ App.vue                  # 앱의 최상위 컴포넌트
│  └─ main.ts                  # Vue 앱 시작 파일
├─ index.html                  # 브라우저가 처음 읽는 HTML
├─ package.json                # 명령어와 라이브러리 목록
├─ tsconfig*.json              # TypeScript 검사 설정
└─ vite.config.ts              # Vite와 @ 경로 별칭 설정
```

### 3.1 새 코드를 어디에 만들지 결정하는 기준

| 만들 내용                        | 위치                           | 예시                 |
| -------------------------------- | ------------------------------ | -------------------- |
| URL로 직접 여는 전체 화면        | `src/views`                    | 학생 상담 이력 화면  |
| 여러 화면에서 반복되는 UI        | `src/components`               | 확인 모달, 상태 배지 |
| 여러 화면에서 반복되는 상태/동작 | `src/composables`              | API 로딩, 임시 알림  |
| 데이터의 TypeScript 형태         | `src/features/.../types.ts`    | `CounselingRecord`   |
| 서버 요청 함수                   | `src/services`를 새로 생성     | `studentApi.ts`      |
| 전역 색상·버튼·입력 스타일       | `src/assets/main.css`          | `.button--success`   |
| 특정 컴포넌트에서만 쓰는 스타일  | 해당 `.vue`의 `<style scoped>` | `.student-card`      |

판단 기준은 “두 곳 이상에서 다시 사용할 가능성이 있는가?”이다. 그렇다면 컴포넌트나 함수로 분리하는 것이 좋다.

---

## 4. HTML 기초: 화면의 의미와 구조

HTML은 모양보다 의미를 먼저 표현한다. 올바른 요소를 사용하면 코드가 이해하기 쉬워지고 키보드와 화면 낭독기 사용도 좋아진다.

### 4.1 태그의 기본 구조

```html
<태그이름 속성="값">화면에 보일 내용</태그이름>
```

```html
<button class="button" type="button">저장</button>
```

- `button`: 이 요소가 버튼이라는 의미다.
- `class="button"`: CSS에서 모양을 적용할 이름이다.
- `type="button"`: 폼을 제출하지 않는 일반 버튼이다.
- `저장`: 사용자에게 보이는 내용이다.

### 4.2 이 프로젝트에서 자주 쓰는 의미 태그

| 태그                   | 용도                                           |
| ---------------------- | ---------------------------------------------- |
| `<header>`             | 페이지나 카드의 머리말                         |
| `<main>`               | 한 페이지의 핵심 내용. 보통 페이지에 하나      |
| `<nav>`                | 사이드바나 탭 같은 이동 메뉴                   |
| `<section>`            | 제목이 있는 내용 묶음                          |
| `<article>`            | 카드처럼 독립적으로 이해되는 내용              |
| `<aside>`              | 본문을 보조하는 사이드 정보                    |
| `<footer>`             | 버튼 영역이나 페이지 하단                      |
| `<h1>`~`<h3>`          | 제목 단계. 모양이 아니라 문서 계층에 맞춰 사용 |
| `<p>`                  | 문단                                           |
| `<ul>`, `<li>`         | 순서가 중요하지 않은 목록                      |
| `<dl>`, `<dt>`, `<dd>` | 이름과 값의 쌍. 학생 요약 정보에 적합          |
| `<table>`              | 행과 열의 관계가 있는 실제 표 데이터           |
| `<form>`               | 입력값을 하나의 제출 단위로 묶음               |
| `<label>`              | 입력 요소의 의미를 설명                        |

`div`는 의미 없는 배치용 상자다. 모든 것을 `div`로 만들기 전에 더 정확한 의미 태그가 있는지 먼저 확인한다. 올바른 HTML 요소는 기본 키보드 동작과 접근성 정보를 제공한다.

### 4.3 입력 폼의 기본 원칙

```html
<div class="field">
  <label for="student-name">학생 이름</label>
  <input id="student-name" type="text" required />
</div>
```

- `label`의 `for`와 `input`의 `id`를 같게 만든다.
- 필수 입력은 `required`를 사용한다.
- 이메일은 `type="email"`, 날짜는 `type="date"`, 전화번호는 `type="tel"`처럼 목적에 맞는 타입을 쓴다.
- 입력 요소 안의 `placeholder`만으로 이름을 대신하지 않는다. 입력하면 사라지기 때문이다.
- 폼 안의 일반 버튼에는 반드시 `type="button"`을 쓴다. 생략하면 제출 버튼으로 동작할 수 있다.

```html
<form @submit.prevent="saveStudent">
  <!-- 입력 필드 -->
  <button type="button" @click="cancel">취소</button>
  <button type="submit">저장</button>
</form>
```

### 4.4 표를 사용할 때

```html
<table>
  <caption class="sr-only">
    담당 학생 목록
  </caption>
  <thead>
    <tr>
      <th scope="col">이름</th>
      <th scope="col">학교</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>김OO</td>
      <td>OO초등학교</td>
    </tr>
  </tbody>
</table>
```

표는 화면 배치용으로 사용하지 않는다. 열 제목에는 `th`와 `scope="col"`을 사용하면 보조 기술이 셀의 의미를 더 정확히 파악할 수 있다.

### 4.5 접근성 최소 점검

- 의미 있는 이미지에는 내용을 설명하는 `alt`를 쓴다.
- 옆 텍스트와 중복되는 장식 이미지는 `alt=""`로 둔다.
- 아이콘만 있는 버튼에는 `aria-label="삭제"`처럼 목적을 쓴다.
- 색상만으로 성공과 실패를 구별하지 않고 문구나 아이콘을 함께 사용한다.
- 키보드 `Tab`으로 모든 버튼과 입력에 이동할 수 있어야 한다.
- `:focus-visible` 테두리를 제거하지 않는다.
- 클릭 기능은 `div`가 아니라 `button`, 이동은 `a` 또는 `RouterLink`를 사용한다.

---

## 5. JavaScript 기초

Vue 코드를 이해하려면 값, 객체, 배열, 함수, 조건문을 먼저 이해해야 한다.

### 5.1 `const`와 `let`

```ts
const teacherName = '이OO'
let page = 1

page = 2
// teacherName = '김OO' // const 자체에는 다른 값을 다시 넣을 수 없음
```

- 기본적으로 `const`를 사용한다.
- 변수 자체를 다른 값으로 바꿔야 할 때만 `let`을 사용한다.
- `var`는 오래된 코드에서 볼 수 있지만 새 코드에서는 사용하지 않는다.

`const` 객체의 속성은 바꿀 수 있다.

```ts
const student = { name: '김OO', age: 10 }
student.age = 11 // 가능
```

### 5.2 기본 자료형

```ts
const name = '김OO' // string: 문자열
const age = 10 // number: 숫자
const active = true // boolean: true 또는 false
const empty = null // 의도적으로 값이 없음
let result // undefined: 아직 값이 정해지지 않음
```

문자열 안에 값을 넣을 때는 백틱과 `${}`를 사용한다.

```ts
const message = `${name} 학생은 ${age}세입니다.`
```

### 5.3 객체와 배열

```ts
const student = {
  id: 1,
  name: '김OO',
  age: 10,
}

console.log(student.name)
console.log(student['age'])
```

```ts
const students = [
  { id: 1, name: '김OO' },
  { id: 2, name: '박OO' },
]

console.log(students[0]?.name)
```

배열 번호는 0부터 시작한다. `?.`는 값이 없으면 오류를 내지 않고 `undefined`를 반환하는 선택적 연결 문법이다.

### 5.4 함수

함수는 여러 줄의 동작에 이름을 붙여 재사용하는 단위다.

```ts
function getStudentLabel(name: string, age: number) {
  return `${name} (${age}세)`
}

const label = getStudentLabel('김OO', 10)
```

화살표 함수도 자주 사용한다.

```ts
const getStudentLabel = (name: string, age: number) => `${name} (${age}세)`
```

Vue에서는 template에서 호출하는 동작에는 이름 있는 함수를 쓰면 읽기 쉽다.

```ts
function saveStudent() {
  console.log('학생 저장')
}
```

```html
<button type="button" @click="saveStudent">저장</button>
```

### 5.5 조건문과 삼항 연산자

```ts
function getScoreLabel(score: number) {
  if (score >= 80) return '우수'
  if (score >= 60) return '보통'
  return '보완 필요'
}
```

두 값 중 하나를 짧게 선택할 때는 삼항 연산자를 사용한다.

```ts
const buttonText = editMode ? '수정 완료' : '수정 시작'
```

조건이 많아지면 삼항 연산자를 겹치지 말고 함수나 `computed`로 분리한다.

### 5.6 자주 사용하는 연산자

```ts
age === 10 // 값과 자료형이 모두 같은지
age !== 10 // 다른지
score >= 80 // 크거나 같은지
isSaved && isValid // 두 조건이 모두 참인지
isAdmin || isTeacher // 하나라도 참인지
!isLoading // true/false 반전
value ?? '기본값' // null 또는 undefined일 때 기본값
student?.guardian?.name // 중간 값이 없을 수 있을 때 안전하게 접근
```

`==`보다 자료형까지 비교하는 `===`를 사용한다.

### 5.7 객체와 배열 복사

```ts
const copiedStudent = { ...student }
const copiedStudents = [...students]
```

`...`는 펼침 연산자다. 폼 수정 시 원본 목업 데이터를 직접 바꾸지 않도록 얕은 복사에 사용한다.

중첩 객체까지 완전히 복사해야 한다면 `structuredClone`을 고려한다.

```ts
const form = structuredClone(student)
```

---

## 6. 배열과 문자열 메서드

현재 프로젝트의 검색, 선택, 재정렬 로직을 이해할 때 가장 중요한 부분이다.

### 6.1 `map`: 각 항목을 바꾼 새 배열

```ts
const names = students.map((student) => student.name)
```

원본 배열의 항목 수는 유지하면서 형태를 바꾼다.

```ts
const copiedItems = curriculumItems.map((item) => ({ ...item }))
```

### 6.2 `filter`: 조건을 통과한 항목만

```ts
const filtered = students.filter((student) => student.age >= 10)
```

대시보드 검색처럼 여러 조건을 합칠 수 있다.

```ts
const filtered = students.filter((student) => {
  const matchesName = student.name.includes(query)
  const matchesAge = selectedAge === '전체' || student.age === Number(selectedAge)
  return matchesName && matchesAge
})
```

### 6.3 `find`와 `findIndex`

```ts
const student = students.find((student) => student.id === 2)
const index = students.findIndex((student) => student.id === 2)
```

- `find`: 조건에 맞는 첫 번째 값 또는 `undefined`
- `findIndex`: 조건에 맞는 첫 번째 위치 또는 `-1`

### 6.4 `some`과 `every`

```ts
const hasIncomplete = items.some((item) => item.achievement < 100)
const allCompleted = items.every((item) => item.achievement === 100)
```

- `some`: 하나라도 조건을 만족하면 `true`
- `every`: 모두 만족해야 `true`

### 6.5 `sort`와 `toSorted`

```ts
const sorted = students.toSorted((a, b) => a.age - b.age)
```

`sort()`는 원본 배열을 변경한다. Vue 상태를 안전하게 다루려면 새 배열을 반환하는 `toSorted()`나 복사 후 `sort()`를 사용하는 편이 명확하다.

```ts
const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
```

### 6.6 `reduce`: 여러 값을 하나로 합치기

```ts
const total = students.reduce((sum, student) => sum + student.age, 0)
const average = students.length === 0 ? 0 : total / students.length
```

합계, 평균, 카테고리별 개수 계산에 사용한다. 처음에는 `reduce`가 복잡할 수 있으므로 단순 반복문이 더 읽기 좋다면 반복문을 사용해도 된다.

### 6.7 문자열 메서드

```ts
const normalizedQuery = query.trim().toLowerCase()
const matched = student.name.toLowerCase().includes(normalizedQuery)
const phoneParts = student.phone.split('-')
const displayName = student.name.replace('OO', '**')
```

- `trim`: 앞뒤 공백 제거
- `toLowerCase`: 영문 소문자 통일
- `includes`: 포함 여부
- `split`: 문자열을 기준 문자로 나눠 배열 생성
- `replace`: 일부 문자열 변경

---

## 7. TypeScript 기초

TypeScript는 실행 시 새로운 기능을 제공하는 것이 아니라, 개발 중 값의 형태를 검사한다.

### 7.1 기본 타입

```ts
const name: string = '김OO'
const age: number = 10
const active: boolean = true
const tags: string[] = ['파닉스', '유창성']
```

대부분은 오른쪽 값을 보고 TypeScript가 타입을 추론하므로 모든 변수에 타입을 반복해서 쓸 필요는 없다.

```ts
const name = '김OO' // string으로 추론
```

### 7.2 객체 설계도 `interface`

```ts
interface Student {
  id: number
  name: string
  age: number
  school: string
  email?: string
}
```

- `email?`: 값이 없어도 되는 선택 속성이다.
- `Student[]`: Student 객체가 여러 개 들어 있는 배열이다.
- 인터페이스 이름은 일반적으로 대문자로 시작한다.

```ts
const students: Student[] = [{ id: 1, name: '김OO', age: 10, school: 'OO초등학교' }]
```

### 7.3 유니언 타입

허용할 값을 제한할 수 있다.

```ts
type StudentStatus = 'active' | 'paused' | 'completed'

interface Student {
  id: number
  status: StudentStatus
}
```

현재 `MetricCard`의 tone과 `StudentForm`의 mode가 이 방식을 사용한다.

```ts
tone?: 'primary' | 'sky' | 'warning'
mode: 'create' | 'edit'
```

### 7.4 함수의 입력과 반환 타입

```ts
function findStudent(id: number): Student | undefined {
  return students.find((student) => student.id === id)
}

function saveStudent(student: Student): void {
  console.log(student)
}
```

- `Student | undefined`: 학생을 찾지 못할 수 있다.
- `void`: 의미 있는 반환값이 없다.

### 7.5 `null`, `undefined`, `!`

```ts
const element = ref<HTMLDivElement | null>(null)
```

화면이 만들어지기 전에는 HTML 요소가 없으므로 `null` 가능성을 적는다.

```ts
const selectedStudent = students[0]!
```

끝의 `!`는 “개발자가 값이 있다고 확신한다”는 표시다. 실제로 배열이 비어 있을 수 있다면 사용하지 말고 안전하게 처리한다.

```ts
const selectedStudent = students[0]
if (!selectedStudent) {
  throw new Error('학생 데이터가 없습니다.')
}
```

### 7.6 타입 단언 `as`

브라우저 이벤트의 `target`은 구체적인 입력 요소인지 알 수 없으므로 필요한 경우 타입을 알려 준다.

```ts
function selectImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
}
```

`as`는 데이터를 변환하지 않는다. 잘못 사용하면 검사를 속일 수 있으므로 실제 형태를 알고 있을 때만 사용한다.

### 7.7 `any`를 피해야 하는 이유

```ts
const data: any = response
data.notExistingMethod() // TypeScript가 막지 못함
```

서버 응답처럼 아직 모르는 값은 `unknown`으로 받고 검사하는 편이 안전하다.

```ts
function isStudent(value: unknown): value is Student {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value && 'name' in value
}
```

---

## 8. Vue 단일 파일 컴포넌트 구조

`.vue` 파일 하나는 보통 script, template, style 세 부분으로 나뉜다.

```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)

function increase() {
  count.value += 1
}
</script>

<template>
  <button type="button" @click="increase">{{ count }}</button>
</template>

<style scoped>
button {
  color: var(--primary-600);
}
</style>
```

### 8.1 `<script setup lang="ts">`

- `setup`: Composition API를 간단하게 작성하는 Vue 문법이다.
- `lang="ts"`: script 안에서 TypeScript를 사용한다.
- 여기서 만든 변수, 함수, import한 컴포넌트는 template에서 바로 쓸 수 있다.
- `defineProps`, `defineEmits`, `withDefaults`는 컴파일 전용 문법이므로 import하지 않는다.

### 8.2 `<template>`

- 실제 HTML 구조와 Vue 지시문을 작성한다.
- template은 하나의 최상위 요소를 사용하는 습관이 구조 파악에 편하다.
- 복잡한 계산을 template 안에 길게 쓰지 말고 script의 함수나 `computed`로 옮긴다.

### 8.3 `<style scoped>`

- 해당 컴포넌트 안의 요소에만 CSS가 적용된다.
- 전역으로 재사용할 스타일은 `main.css`에 둔다.
- 자식 컴포넌트 내부에 스타일을 적용해야 한다면 `:deep()`이 필요하지만, 가능하면 자식 컴포넌트가 자신의 스타일을 책임지게 한다.

---

## 9. Vue template 문법

### 9.1 텍스트 출력 `{{ }}`

```html
<strong>{{ student.name }}</strong> <span>{{ student.age }}세</span>
```

이중 중괄호 안에는 짧고 단순한 표현식만 쓴다.

### 9.2 동적 속성 `v-bind`와 `:`

```html
<img :src="previewUrl" :alt="student.name" /> <button :disabled="isLoading">저장</button>
```

`:`는 `v-bind:`의 줄임말이다. 콜론이 없으면 고정 문자열이다.

```html
<StudentForm mode="edit" />
<!-- 문자열 'edit' 전달 -->

<StudentForm :initial-value="selectedStudent" />
<!-- selectedStudent 객체 전달 -->
```

### 9.3 이벤트 `v-on`과 `@`

```html
<button type="button" @click="save">저장</button>
<input type="file" @change="selectImage" />
<form @submit.prevent="submitForm"></form>
```

`@`는 `v-on:`의 줄임말이다.

- `.prevent`: 브라우저 기본 동작을 막는다.
- `.stop`: 이벤트가 부모로 전달되는 것을 막는다.
- `.once`: 한 번만 실행한다.

```html
<button @click.stop="removeItem">삭제</button>
```

이벤트 처리 코드가 길면 template에 직접 쓰지 않는다.

```html
<!-- 피하기 -->
<button @click="saved = true; message = '완료'; page += 1">저장</button>

<!-- 권장 -->
<button @click="handleSave">저장</button>
```

### 9.4 조건부 표시 `v-if`

```html
<p v-if="isLoading">불러오는 중입니다.</p>
<p v-else-if="errorMessage">{{ errorMessage }}</p>
<StudentList v-else :students="students" />
```

- `v-if`: 조건이 거짓이면 HTML 요소 자체를 만들지 않는다.
- `v-show`: 요소는 유지하고 CSS `display`만 바꾼다.
- 자주 켰다 끄는 단순 요소는 `v-show`, 생성 비용이 크거나 드물게 보이는 영역은 `v-if`를 고려한다.

### 9.5 반복 출력 `v-for`

```html
<article v-for="student in students" :key="student.id">{{ student.name }}</article>
```

`key`는 Vue가 각 항목을 구별하는 기준이다. 배열 위치인 `index`보다 데이터의 고유 id를 사용한다.

```html
<article v-for="(item, index) in items" :key="item.id">{{ index + 1 }}. {{ item.title }}</article>
```

`v-if`와 `v-for`를 같은 요소에 함께 쓰지 않는다. 먼저 `computed`로 필터링한다.

### 9.6 입력 연결 `v-model`

```ts
const query = ref('')
```

```html
<input v-model="query" type="search" />
```

사용자가 입력하면 `query`가 바뀌고, 코드에서 `query`를 바꾸면 입력 화면도 바뀐다.

```html
<input v-model.trim="form.name" /> <input v-model.number="form.age" type="number" />
```

- `.trim`: 앞뒤 공백을 제거한다.
- `.number`: 가능한 경우 숫자로 변환한다.

### 9.7 동적 클래스와 스타일

```html
<button :class="{ active: selectedId === student.id }">{{ student.name }}</button>
```

```html
<div :class="['badge', `badge--${status}`]">{{ label }}</div>
```

```html
<div :style="{ width: `${achievement}%` }"></div>
```

동적 style은 데이터에 따라 값이 계속 달라질 때만 사용한다. 고정된 모양은 CSS 클래스로 작성한다.

---

## 10. Vue 반응성: `ref`, `reactive`, `computed`, `watch`

반응형 값이 바뀌면 Vue가 그 값을 사용하는 화면 부분을 자동으로 다시 그린다.

### 10.1 `ref`

문자열, 숫자, boolean, 선택 id처럼 하나의 값을 관리할 때 가장 자주 사용한다.

```ts
const query = ref('')
const page = ref(1)
const saved = ref(false)

function nextPage() {
  page.value += 1
}
```

- script에서는 `.value`가 필요하다.
- template에서는 Vue가 자동으로 풀어 주므로 `.value`를 쓰지 않는다.

```html
<span>{{ page }}</span>
```

### 10.2 `reactive`

폼처럼 여러 속성을 하나로 묶어 수정할 때 편리하다.

```ts
const form = reactive({
  name: '',
  age: 0,
  school: '',
})

form.name = '김OO'
```

`reactive` 객체 자체를 통째로 새 객체로 교체하지 않는다.

```ts
// 피하기
form = newStudent

// 기존 객체에 값 복사
Object.assign(form, newStudent)
```

### 10.3 `ref`와 `reactive` 선택 기준

| 상황                  | 권장                                                               |
| --------------------- | ------------------------------------------------------------------ |
| 문자열, 숫자, boolean | `ref`                                                              |
| 현재 선택 id          | `ref`                                                              |
| DOM 요소 참조         | `ref`                                                              |
| 큰 입력 폼 객체       | `reactive`                                                         |
| 배열                  | 팀 규칙에 따라 가능하지만 이 프로젝트는 `ref` 사용이 이해하기 쉬움 |

### 10.4 `computed`

다른 상태로부터 계산되는 값이다. 원본이 바뀔 때만 자동 재계산하고 결과를 저장한다.

```ts
const filteredStudents = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return students.value.filter((student) => student.name.toLowerCase().includes(keyword))
})
```

다음은 `computed`에 적합하다.

- 검색/필터 결과
- 합계와 평균
- 선택 id로 찾은 상세 객체
- 등록/수정 모드에 따라 달라지는 제목
- 버튼 활성화 조건

`computed` 안에서 다른 상태를 변경하거나 API 요청을 하지 않는다. 입력을 받아 값을 계산하는 역할만 맡긴다.

### 10.5 일반 함수와 `computed`의 차이

```ts
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

function getFullName() {
  return `${firstName.value} ${lastName.value}`
}
```

- `computed`: template에서 값처럼 사용하고 의존 값이 바뀔 때만 재계산한다.
- 함수: 호출할 때마다 실행하며 매개변수를 받을 수 있다.

### 10.6 `watch`

특정 값이 바뀌었을 때 부수 효과를 실행한다.

```ts
watch(query, (newQuery, oldQuery) => {
  console.log(`${oldQuery}에서 ${newQuery}로 변경`)
})
```

사용 예:

- 검색 조건 변경 후 페이지를 1로 초기화
- 상태 변경 시 localStorage에 저장
- route의 id 변경 시 새 데이터 요청
- 차트 option 변경 시 차트 다시 그리기

단순 계산은 `watch`가 아니라 `computed`를 쓴다.

```ts
watch([query, ageFilter], () => {
  page.value = 1
})
```

객체 내부까지 감시하려면 `deep`이 필요할 수 있지만 비용이 있으므로 필요한 값만 감시하는 편이 좋다.

```ts
watch(
  () => form.name,
  (name) => {
    console.log(name)
  },
)
```

---

## 11. 생명주기와 template ref

컴포넌트는 만들어지고, 화면에 붙고, 갱신되고, 제거된다.

### 11.1 자주 쓰는 생명주기

```ts
onMounted(() => {
  // 실제 HTML이 화면에 만들어진 뒤 실행
})

onBeforeUnmount(() => {
  // 화면에서 제거되기 직전 정리
})

onUnmounted(() => {
  // 화면에서 제거된 뒤 정리
})
```

현재 프로젝트의 `ChartPanel.vue`는 `onMounted` 후 차트를 만들고, `onBeforeUnmount`에서 차트와 `ResizeObserver`를 정리한다. `useTemporaryNotice.ts`는 `onUnmounted`에서 남아 있는 타이머를 정리한다.

### 11.2 HTML 요소 직접 참조

```ts
const inputElement = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputElement.value?.focus()
})
```

```html
<input ref="inputElement" />
```

Vue 상태로 해결할 수 있는 일을 DOM 직접 조작으로 처리하지 않는다. 포커스, 외부 차트 라이브러리, 크기 측정처럼 실제 요소가 꼭 필요한 경우에만 사용한다.

### 11.3 `nextTick`

상태를 바꾼 직후 Vue가 HTML 갱신을 마칠 때까지 기다린다.

```ts
isOpen.value = true
await nextTick()
dialogInput.value?.focus()
```

---

## 12. 컴포넌트 재사용: props, emits, slots

컴포넌트는 “입력(props)을 받아 UI를 그리고, 사용자 동작을 이벤트(emits)로 부모에게 알리는 함수”처럼 생각할 수 있다.

### 12.1 props: 부모에서 자식으로 데이터 전달

```vue
<script setup lang="ts">
defineProps<{
  label: string
  value: string
  disabled?: boolean
}>()
</script>

<template>
  <article>
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
  </article>
</template>
```

```html
<InfoCard label="전체 학생" value="28명" :disabled="isLoading" />
```

props는 자식이 직접 변경하지 않는다. 변경이 필요하면 부모에게 이벤트를 보낸다.

### 12.2 기본값 `withDefaults`

```ts
const props = withDefaults(
  defineProps<{
    message?: string
    duration?: number
  }>(),
  {
    message: '저장되었습니다.',
    duration: 2200,
  },
)
```

배열과 객체 기본값은 컴포넌트 인스턴스끼리 공유하지 않도록 함수로 반환한다.

```ts
withDefaults(defineProps<{ items?: string[] }>(), {
  items: () => [],
})
```

### 12.3 emits: 자식에서 부모로 알림

`StudentForm`을 실제 서버 저장 구조로 발전시키려면 폼이 라우터까지 직접 처리하기보다 부모에게 제출 데이터를 보내는 설계가 재사용하기 좋다.

```vue
<!-- StudentForm.vue -->
<script setup lang="ts">
import type { Student } from '@/features/teacher/types'

const emit = defineEmits<{
  submit: [student: Student]
  cancel: []
}>()

function submitForm() {
  emit('submit', { ...form })
}
</script>

<template>
  <form @submit.prevent="submitForm">
    <!-- 입력 필드 -->
    <button type="button" @click="emit('cancel')">취소</button>
    <button type="submit">저장</button>
  </form>
</template>
```

```vue
<!-- StudentCreateView.vue -->
<StudentForm @submit="createStudent" @cancel="router.back()" />
```

### 12.4 slot: 부모가 자식 내부 일부를 채움

현재 `MetricCard`는 아이콘 자리에 기본 slot을 사용한다.

```vue
<MetricCard label="학생 수" value="28명" description="2명 증가">
  ♙
</MetricCard>
```

이름 있는 slot도 만들 수 있다.

```vue
<!-- BaseCard.vue -->
<article class="surface">
  <header><slot name="header" /></header>
  <div><slot /></div>
  <footer><slot name="footer" /></footer>
</article>
```

```vue
<BaseCard>
  <template #header><h2>학생 정보</h2></template>
  <p>본문</p>
  <template #footer><button>저장</button></template>
</BaseCard>
```

### 12.5 언제 컴포넌트로 분리할까

분리를 고려하는 신호:

- 같은 구조가 두 번 이상 반복된다.
- 한 Vue 파일이 너무 길어 원하는 부분을 찾기 어렵다.
- 모달, 버튼, 카드처럼 독립적인 이름을 붙일 수 있다.
- 입력값과 출력 이벤트를 명확히 정의할 수 있다.
- 복잡한 영역을 따로 테스트하고 싶다.

분리하지 않아도 되는 경우:

- 해당 화면에서 한 번만 쓰는 아주 짧은 마크업이다.
- 분리하면 props가 지나치게 많아져 오히려 이해가 어렵다.

---

## 13. composable: 상태가 있는 로직 재사용

composable은 Vue의 `ref`, `computed`, 생명주기를 사용하면서 여러 컴포넌트에서 재사용하는 함수다. 이름은 관례적으로 `use`로 시작한다.

현재 프로젝트의 `useTemporaryNotice`가 대표 예다.

```ts
export function useTemporaryNotice(duration = 2200) {
  const visible = ref(false)
  let timer: ReturnType<typeof window.setTimeout> | undefined

  function show() {
    if (timer) window.clearTimeout(timer)
    visible.value = true
    timer = window.setTimeout(() => {
      visible.value = false
    }, duration)
  }

  onUnmounted(() => {
    if (timer) window.clearTimeout(timer)
  })

  return { visible, show }
}
```

사용하는 화면:

```ts
const { visible: saved, show: showSaved } = useTemporaryNotice()
```

### 13.1 앞으로 추가하기 좋은 composable

- `useAsyncState`: 로딩, 오류, 결과 상태 관리
- `usePagination`: 현재 페이지, 전체 페이지, 다음/이전 이동
- `useDebouncedRef`: 검색 입력을 잠시 기다렸다가 반영
- `useConfirm`: 삭제 확인 모달 상태
- `useLocalStorage`: 설정값을 브라우저에 저장

로직에 Vue 반응성이 필요 없으면 composable 대신 일반 유틸리티 함수로 만든다.

```ts
// src/utils/formatters.ts
export function formatPhone(phone: string) {
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
}
```

---

## 14. Vue Router: URL과 화면 연결

### 14.1 기본 구성

```ts
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/teacher/dashboard',
      name: 'teacher-dashboard',
      component: () => import('@/views/teacher/TeacherDashboardView.vue'),
    },
  ],
})
```

- `path`: 브라우저 주소
- `name`: 코드에서 사용하는 고유한 라우트 이름
- `component`: 해당 주소에서 보여 줄 View
- `import()` 함수: 해당 화면이 필요할 때만 내려받는 지연 로딩
- `meta`: 제목, 메뉴 영역, 인증 필요 여부 같은 부가 정보

### 14.2 링크 이동과 함수 이동

사용자가 클릭하는 일반 메뉴는 `RouterLink`를 우선 사용한다.

```html
<RouterLink :to="{ name: 'student-overview', params: { id: student.id } }"> 상세 보기 </RouterLink>
```

저장 성공 후 이동처럼 코드 결과에 따라 움직일 때는 `useRouter`를 사용한다.

```ts
const router = useRouter()

await saveStudent()
await router.push({ name: 'student-overview', params: { id: student.id } })
```

주요 차이:

- `router.push`: 현재 주소를 기록에 추가하여 뒤로 가기가 가능하다.
- `router.replace`: 현재 기록을 교체한다. 로그인 후 되돌아가면 안 되는 화면 등에 쓴다.
- `router.back`: 브라우저 기록에서 한 단계 뒤로 간다.

### 14.3 동적 주소와 route params

```ts
{
  path: 'students/:id',
  name: 'student-overview',
  component: () => import('@/views/teacher/StudentOverviewView.vue'),
}
```

```ts
const route = useRoute()
const studentId = computed(() => Number(route.params.id))
```

URL의 값은 기본적으로 문자열이다. 숫자 id가 필요하면 `Number`로 변환하고 `NaN`인지 확인한다.

```ts
const studentId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})
```

### 14.4 중첩 라우트

현재 학생 관리 화면은 공통 학생 요약과 탭을 유지하고 안쪽 View만 바꾼다.

```ts
{
  path: 'students/:id',
  component: () => import('@/layouts/StudentManagementLayout.vue'),
  children: [
    { path: '', name: 'student-overview', component: OverviewView },
    { path: 'report', name: 'student-report', component: ReportView },
  ],
}
```

부모 레이아웃에 하위 화면이 들어갈 자리가 있어야 한다.

```html
<StudentSummaryHeader />
<StudentTabs />
<RouterView />
```

### 14.5 새 학생 탭을 추가하는 순서

예: 상담 기록 탭 추가

1. `src/views/teacher/StudentCounselingView.vue`를 만든다.
2. `router/index.ts`의 학생 `children`에 라우트를 추가한다.
3. `StudentTabs.vue`의 `tabs` 배열에 메뉴를 추가한다.
4. `pnpm type-check`를 실행한다.

```ts
{
  path: 'counseling',
  name: 'student-counseling',
  component: () => import('@/views/teacher/StudentCounselingView.vue'),
}
```

```ts
{ label: '상담 기록', name: 'student-counseling' }
```

### 14.6 인증이 추가될 때

```ts
{
  path: '/teacher',
  meta: { requiresAuth: true },
  children: [],
}

router.beforeEach((to) => {
  const loggedIn = Boolean(localStorage.getItem('access-token'))
  if (to.meta.requiresAuth && !loggedIn) {
    return { name: 'login' }
  }
})
```

실제 인증에서는 토큰 저장 위치와 보안 정책을 백엔드 담당자와 반드시 합의한다. 예제처럼 localStorage를 무조건 선택하면 안 된다.

---

## 15. CSS 기초와 현재 디자인 시스템

CSS 규칙은 “어떤 요소를 선택해서 어떤 속성을 적용할지”로 구성된다.

```css
.student-card {
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
}
```

### 15.1 선택자

```css
.button {
} /* class가 button인 요소 */
.student-card strong {
} /* 카드 안의 strong */
.student-card > img {
} /* 카드의 바로 아래 img */
.button:hover {
} /* 마우스를 올린 상태 */
.input:focus {
} /* 입력에 초점이 있는 상태 */
.row:last-child {
} /* 마지막 행 */
.active::before {
} /* HTML 없이 만드는 가상 요소 */
```

전역 스타일에서 태그 선택자를 과도하게 쓰면 예상하지 못한 곳까지 바뀐다. 컴포넌트 의미를 담은 class를 중심으로 작성한다.

### 15.2 박스 모델

모든 요소는 다음 네 영역으로 생각할 수 있다.

```text
margin  : 다른 요소와의 바깥 간격
border  : 테두리
padding : 테두리와 내용 사이의 안쪽 간격
content : 글자나 이미지가 놓이는 실제 내용
```

`main.css`에는 다음 규칙이 있어 `width` 안에 padding과 border가 포함된다.

```css
* {
  box-sizing: border-box;
}
```

### 15.3 단위

| 단위       | 의미                      | 주 사용처                         |
| ---------- | ------------------------- | --------------------------------- |
| `px`       | 고정 픽셀                 | 테두리, 작은 간격, 관리 화면 크기 |
| `%`        | 부모 크기 비율            | 너비, 달성률 막대                 |
| `rem`      | 문서 기본 글자 크기 비율  | 접근성을 고려한 글자와 간격       |
| `vh`, `vw` | 화면 높이/너비 비율       | 전체 높이 레이아웃                |
| `fr`       | Grid에서 남는 공간의 비율 | 열 너비                           |

### 15.4 CSS 변수

프로젝트 색상과 크기는 `main.css`의 `:root`에 정의되어 있다.

```css
:root {
  --primary-600: #4f46e5;
  --slate-500: #64748b;
  --radius-md: 12px;
  --shadow-card: 0 8px 28px rgba(15, 23, 42, 0.06);
}
```

```css
.custom-card {
  border-radius: var(--radius-md);
  color: var(--slate-500);
  box-shadow: var(--shadow-card);
}
```

새 화면에서 비슷한 색을 임의로 추가하기 전에 기존 변수를 먼저 찾는다.

### 15.5 현재 색상 토큰의 의미

| 변수                           | 용도                            |
| ------------------------------ | ------------------------------- |
| `--primary-50`~`--primary-700` | 선택 상태, 기본 버튼, 핵심 강조 |
| `--sky-500`                    | 정보성 차트와 보조 강조         |
| `--teal-500`                   | 성취도 등 별도 데이터 계열      |
| `--success-600`                | 저장 성공, 상승 상태            |
| `--warning-500`                | 주의, 목표 미달                 |
| `--danger-600`                 | 삭제, 오류                      |
| `--slate-50`~`--slate-950`     | 배경, 테두리, 보조 글자, 본문   |
| `--white`                      | 카드와 입력 배경                |

### 15.6 현재 공통 클래스

| 클래스               | 역할                                       |
| -------------------- | ------------------------------------------ |
| `.page-stack`        | 페이지의 큰 섹션을 24px 간격으로 세로 배치 |
| `.page-heading`      | 페이지 제목과 오른쪽 주요 동작 배치        |
| `.surface`           | 흰색 카드 배경, 테두리, 모서리, 그림자     |
| `.surface-header`    | 카드 제목과 오른쪽 부가 정보 배치          |
| `.button`            | 기본 강조 버튼                             |
| `.button--secondary` | 보조 버튼                                  |
| `.button--danger`    | 삭제 버튼                                  |
| `.button--small`     | 표 내부의 작은 버튼                        |
| `.field`             | label과 입력 요소를 세로 배치              |
| `.input`             | 한 줄 입력 공통 스타일                     |
| `.select`            | 선택 목록 공통 스타일                      |
| `.textarea`          | 여러 줄 입력 공통 스타일                   |
| `.status-message`    | 저장 성공 안내 상자                        |
| `.muted`             | 덜 중요한 보조 문구                        |
| `.print-hidden`      | 인쇄 시 숨길 요소                          |

```html
<section class="surface">
  <div class="surface-header">
    <h2>학생 정보</h2>
  </div>
  <div class="card-content">내용</div>
</section>
```

### 15.7 클래스 이름 작성

현재 코드는 BEM과 비슷한 형태를 사용한다.

```css
.student-summary {
} /* 블록 */
.student-summary__actions {
} /* 블록의 내부 요소 */
.metric-card--warning {
} /* 상태나 변형 */
```

이름만 보고 소속과 목적을 알 수 있게 한다. `.box1`, `.left`, `.blue-text`처럼 모양만 나타내는 이름은 변경에 약하다.

---

## 16. Flexbox와 Grid

### 16.1 Flexbox: 한 방향 배치

가로 한 줄 또는 세로 한 줄의 정렬에 적합하다.

```css
.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
```

- `flex-direction`: 가로 `row` 또는 세로 `column`
- `align-items`: 교차 방향 정렬
- `justify-content`: 주 방향 정렬
- `gap`: 자식 사이 간격
- `flex-wrap: wrap`: 공간이 부족하면 다음 줄로 이동
- `margin-left: auto`: 특정 항목을 오른쪽 끝으로 밀기

사용 예:

- 저장/취소 버튼 줄
- 탭 메뉴
- 아이콘과 글자
- 헤더의 좌우 정렬

### 16.2 Grid: 행과 열 배치

열과 행을 함께 관리하는 카드 목록, 폼, 전체 페이지 레이아웃에 적합하다.

```css
.form-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid__wide {
  grid-column: 1 / -1;
}
```

- `repeat(2, ...)`: 같은 열 두 개
- `1fr`: 남는 공간 한 몫
- `minmax(0, 1fr)`: 내용이 길어도 열이 부모를 밀어내지 않게 함
- `grid-column: 1 / -1`: 첫 열부터 마지막 열까지 차지

반응형 카드 목록:

```css
.card-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
```

### 16.3 무엇을 선택할까

| 상황                      | 선택                     |
| ------------------------- | ------------------------ |
| 버튼 여러 개를 한 줄 정렬 | Flexbox                  |
| 아이콘과 텍스트 정렬      | Flexbox                  |
| 입력 폼을 2열로 구성      | Grid                     |
| 사이드바와 본문           | Grid                     |
| 카드 목록의 여러 행과 열  | Grid                     |
| 하나만 가운데 정렬        | Flex 또는 Grid 모두 가능 |

### 16.4 자주 발생하는 넘침 문제

Grid나 Flex의 자식 내용이 길면 부모 너비를 밀 수 있다.

```css
.content {
  min-width: 0;
}

.title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

표가 넓으면 표를 감싼 영역에만 스크롤을 준다.

```css
.table-scroll {
  overflow-x: auto;
}
```

---

## 17. 위치, 반응형, 인쇄 스타일

### 17.1 `position`

```css
.header {
  position: sticky;
  top: 0;
  z-index: 20;
}
```

- `static`: 기본 문서 흐름
- `relative`: 원래 자리를 기준으로 자식 absolute의 기준점이 됨
- `absolute`: 가장 가까운 position 기준 부모 안에서 위치 지정
- `fixed`: 브라우저 화면 기준 고정
- `sticky`: 스크롤하다 지정 위치에 붙음

토스트처럼 부모 카드 안에 띄우려면 부모가 기준점이어야 한다.

```css
.card {
  position: relative;
}

.toast {
  position: absolute;
  top: 14px;
  right: 20px;
}
```

### 17.2 현재 프로젝트의 화면 폭 주의

현재 `main.css`에는 데스크톱 목업을 위해 다음 설정이 있다.

```css
html,
body {
  min-width: 1180px;
}
```

따라서 작은 화면에서는 반응형으로 줄어들지 않고 가로 스크롤이 생긴다. 모바일 대응을 시작하려면 이 정책을 먼저 결정하고 레이아웃 전체를 함께 점검해야 한다.

### 17.3 반응형 미디어 쿼리 예시

```css
@media (max-width: 900px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .page-heading {
    flex-direction: column;
  }
}
```

브레이크포인트는 특정 기기 이름이 아니라 실제 콘텐츠가 깨지는 폭을 기준으로 정한다.

### 17.4 인쇄 스타일

현재 보고서 화면은 `@media print`를 사용한다.

```css
@media print {
  .print-hidden {
    display: none !important;
  }

  .surface {
    box-shadow: none;
  }
}
```

인쇄 확인 항목:

- 메뉴와 조작 버튼 숨김
- 배경색이 없어도 정보 구별 가능
- 카드가 페이지 중간에서 부자연스럽게 잘리지 않는지
- 차트와 표가 종이 폭을 넘지 않는지

```css
@media print {
  .report-section {
    break-inside: avoid;
  }
}
```

### 17.5 앞으로 추가하면 유용한 공통 스타일

아래 패턴이 여러 화면에서 두 번 이상 필요해지면 `main.css`에 공통 클래스로 추가한다. 한 화면에서만 필요하면 해당 Vue 파일의 scoped style에 둔다.

화면에서는 숨기지만 화면 낭독기에는 제목을 제공하는 클래스:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

빈 데이터 안내:

```css
.empty-state {
  display: grid;
  min-height: 180px;
  place-items: center;
  padding: 32px;
  color: var(--slate-500);
  text-align: center;
}
```

오류 안내:

```css
.error-message {
  padding: 11px 14px;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  background: #fff1f2;
  color: var(--danger-600);
  font-weight: 600;
}
```

비활성 버튼:

```css
.button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}
```

로딩 스켈레톤:

```css
.skeleton {
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--slate-100), var(--slate-50), var(--slate-100));
  background-size: 200% 100%;
  animation: skeleton-loading 1.4s infinite linear;
}

@keyframes skeleton-loading {
  to {
    background-position: -200% 0;
  }
}
```

사용자가 운영체제에서 움직임 줄이기를 선택했다면 불필요한 애니메이션을 끈다.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

모달 배경과 패널:

```css
.modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  padding: 24px;
  place-items: center;
  background: rgba(15, 23, 42, 0.48);
}

.modal-panel {
  width: min(100%, 520px);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  border-radius: var(--radius-lg);
  background: var(--white);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
}
```

실제 모달은 CSS만으로 끝나지 않는다. 열릴 때 모달 내부로 포커스를 이동하고, 닫힐 때 원래 버튼으로 돌려주며, `Escape` 닫기와 배경 스크롤 방지를 함께 구현해야 한다. 규모가 커지면 검증된 접근성 UI 라이브러리를 검토한다.

### 17.6 Vue `Transition`으로 나타남과 사라짐 처리

현재 `SaveToast.vue`가 사용하는 방식이다.

```vue
<Transition name="fade">
  <div v-if="visible" class="notice">저장되었습니다.</div>
</Transition>
```

Vue가 상태에 맞춰 `fade-enter-*`, `fade-leave-*` 클래스를 자동으로 붙인다.

```css
.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

목록 항목 여러 개의 이동 애니메이션에는 `TransitionGroup`을 사용할 수 있지만, 데이터가 많거나 자주 바뀌는 표에는 성능과 가독성을 먼저 확인한다.

---

## 18. 현재 프로젝트의 재사용 요소와 활용법

### 18.1 현재 화면별 코드 지도

먼저 만들려는 기능과 비슷한 기존 화면을 찾아 아래 문법과 CSS 패턴을 참고한다.

| 파일                             | 화면 역할                    | 참고할 Vue/JavaScript                                                             | 참고할 CSS                                       |
| -------------------------------- | ---------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| `TeacherDashboardView.vue`       | 지표, 검색, 필터, 학생 표    | `ref`, `computed`, `filter`, `includes`, `Number`, `v-for`, `v-if`, `router.push` | 3열 Grid, 검색 Flex, 가로 스크롤 표, 페이지 버튼 |
| `StudentCreateView.vue`          | 학생 등록 진입               | 컴포넌트 import, 고정 props                                                       | 별도 스타일 없이 폼 재사용                       |
| `StudentEditView.vue`            | 학생 수정 진입               | 객체 props, 목업 데이터 import                                                    | 별도 스타일 없이 폼 재사용                       |
| `StudentOverviewView.vue`        | 정확도 차트, 학습 로그, 메모 | `ref`, composable, ECharts option, 배열 행 반복                                   | 비율 Grid, `:deep()`, 전체 열 차지, 로그 3열     |
| `StudentCurriculumView.vue`      | 커리큘럼 선택과 순서 변경    | `find`, `findIndex`, 배열 항목 교환, `forEach`, 선택적 연결                       | 목록/추천 2열 Grid, active/hover, 상세 정보 Grid |
| `StudentTrainingHistoryView.vue` | 훈련 세션과 읽기 속도        | `computed`, `find`, `Math.max`, ECharts                                           | 목록 행 Grid, 선택 상태, 차트 `:deep()`          |
| `StudentTestHistoryView.vue`     | 검사 비교와 의견             | `computed<EChartsOption>`, `Math.min`, `v-model`                                  | 차트/요약 2열 Grid, 점수 배지, 의견 영역         |
| `StudentReportView.vue`          | 종합 보고서와 인쇄           | 여러 chart option, `setTimeout`, `window.print`, composable                       | 4열 지표, 차트 Grid, 그라데이션, `@media print`  |
| `TeacherSettingsView.vue`        | 교수자 프로필 폼             | `reactive`, 파일 이벤트, Blob URL, 폼 submit                                      | 사진/입력 2열 Grid, 원형 이미지, 전체 폭 footer  |
| `TeacherLayout.vue`              | 헤더·사이드바 공통 골격      | route meta, `computed`, 중첩 `RouterView`                                         | 헤더 높이 계산, 고정 사이드바와 본문 Grid        |
| `StudentManagementLayout.vue`    | 학생 요약·탭 공통 골격       | 중첩 `RouterView`                                                                 | 공통 영역의 세로 배치                            |

`mockData.ts`는 화면을 채우는 임시 데이터, `types.ts`는 그 데이터 형태의 기준이다. 새 데이터 항목을 추가할 때는 interface와 목업 객체를 함께 변경하고, 해당 값을 사용하는 template도 확인한다.

### 18.2 `MetricCard.vue`

용도: 대시보드의 핵심 숫자 요약

```vue
<MetricCard label="상담 예정" value="4명" description="오전 2명 · 오후 2명" tone="sky">
  ◷
</MetricCard>
```

새 tone이 필요하면 허용 타입, template 클래스, CSS 변형을 함께 추가한다.

### 18.3 `ChartPanel.vue`

용도: ECharts 생성, 크기 변경, 정리를 공통 처리

```ts
const scoreChart: EChartsOption = {
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['1주', '2주', '3주'] },
  yAxis: { type: 'value', max: 100 },
  series: [{ type: 'line', data: [60, 72, 81] }],
}
```

```vue
<ChartPanel :option="scoreChart" height="320px" aria-label="주간 점수 변화" />
```

### 18.4 `SaveToast.vue`와 `useTemporaryNotice`

```ts
const { visible: saved, show: showSaved } = useTemporaryNotice()

async function saveMemo() {
  await requestSaveMemo()
  showSaved()
}
```

```vue
<section class="surface memo-card">
  <SaveToast :visible="saved" message="메모를 저장했습니다." />
  <button class="button" type="button" @click="saveMemo">저장</button>
</section>
```

부모 카드에 `position: relative`를 추가해야 토스트의 absolute 위치가 카드 기준으로 잡힌다.

### 18.5 `StudentForm.vue`

용도: 학생 등록과 수정 화면의 입력 구조 공유

```vue
<StudentForm mode="create" />
<StudentForm mode="edit" :initial-value="selectedStudent" />
```

현재는 목업이므로 저장 후 화면만 이동한다. API를 연결할 때는 12.3절처럼 `submit` 이벤트를 부모에게 보내고 Create/Edit View가 각각 POST/PUT 요청을 담당하도록 개선하는 것이 좋다.

### 18.6 레이아웃과 탭

- `TeacherLayout`: 교수자 헤더 + 사이드바 + 하위 View
- `StudentManagementLayout`: 학생 요약 + 탭 + 하위 View
- `StudentTabs`: 라우트 name 기반의 학생 관리 메뉴
- `TeacherSidebar`: route meta의 section을 사용한 현재 메뉴 강조

새 기능이 기존 레이아웃 안에 들어가야 하는지, 완전히 다른 레이아웃이 필요한지 먼저 결정한다.

---

## 19. 서버 API 연결 준비

현재 화면은 `mockData.ts`를 사용한다. 실제 서비스에서는 다음 흐름이 필요하다.

```text
사용자 동작
  → View의 이벤트 함수
  → service의 API 함수
  → 서버 응답
  → Vue 상태 갱신
  → 화면 자동 갱신
```

### 19.1 서버 통신을 View와 분리하기

`src/services` 폴더를 만들고 기능별 API 함수를 둔다.

```ts
// src/services/studentApi.ts
import type { Student } from '@/features/teacher/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function getStudents(): Promise<Student[]> {
  const response = await fetch(`${API_BASE_URL}/students`)

  if (!response.ok) {
    throw new Error(`학생 목록 요청 실패: ${response.status}`)
  }

  return response.json() as Promise<Student[]>
}

export async function getStudent(id: number): Promise<Student> {
  const response = await fetch(`${API_BASE_URL}/students/${id}`)

  if (!response.ok) {
    throw new Error(`학생 정보 요청 실패: ${response.status}`)
  }

  return response.json() as Promise<Student>
}
```

View에서는 URL이나 HTTP 세부 내용을 몰라도 된다.

```ts
import { getStudents } from '@/services/studentApi'

const students = ref<Student[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

async function loadStudents() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    students.value = await getStudents()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '알 수 없는 오류입니다.'
  } finally {
    isLoading.value = false
  }
}
```

### 19.2 `async`, `await`, `try`, `catch`, `finally`

```ts
async function save() {
  try {
    await requestSave()
    showSaved()
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}
```

- `async`: 비동기 함수임을 표시한다.
- `await`: Promise가 완료될 때까지 해당 함수 안에서 기다린다.
- `try`: 성공을 기대하는 코드를 실행한다.
- `catch`: 네트워크나 코드 오류를 처리한다.
- `finally`: 성공/실패와 관계없이 실행한다. 로딩 종료에 적합하다.

`fetch`는 404나 500 응답만으로 자동으로 `catch`에 들어가지 않는다. 반드시 `response.ok`를 확인한다.

### 19.3 로딩, 오류, 빈 데이터는 별개의 상태다

```vue
<template>
  <section class="surface">
    <p v-if="isLoading" class="state-panel">불러오는 중입니다.</p>

    <div v-else-if="errorMessage" class="state-panel state-panel--error">
      <p>{{ errorMessage }}</p>
      <button class="button button--secondary" type="button" @click="loadStudents">
        다시 시도
      </button>
    </div>

    <p v-else-if="students.length === 0" class="state-panel">등록된 학생이 없습니다.</p>

    <StudentTable v-else :students="students" />
  </section>
</template>
```

```css
.state-panel {
  display: grid;
  min-height: 180px;
  place-items: center;
  padding: 32px;
  color: var(--slate-500);
  text-align: center;
}

.state-panel--error {
  color: var(--danger-600);
}
```

### 19.4 POST, PUT/PATCH, DELETE

```ts
type StudentInput = Omit<Student, 'id'>

export async function createStudent(input: StudentInput): Promise<Student> {
  const response = await fetch(`${API_BASE_URL}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) throw new Error(`학생 등록 실패: ${response.status}`)
  return response.json() as Promise<Student>
}
```

```ts
export async function updateStudent(id: number, input: StudentInput): Promise<Student> {
  const response = await fetch(`${API_BASE_URL}/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) throw new Error(`학생 수정 실패: ${response.status}`)
  return response.json() as Promise<Student>
}
```

```ts
export async function deleteStudent(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/students/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) throw new Error(`학생 삭제 실패: ${response.status}`)
}
```

HTTP 메서드는 백엔드 API 명세를 따른다.

- `GET`: 조회
- `POST`: 새 데이터 생성
- `PUT`: 전체 데이터 교체
- `PATCH`: 일부 속성 수정
- `DELETE`: 삭제

### 19.5 중복 요청과 취소

사용자가 빠르게 다른 학생을 선택하면 먼저 보낸 요청이 나중 요청보다 늦게 도착할 수 있다. `AbortController`로 이전 요청을 취소할 수 있다.

```ts
let controller: AbortController | null = null

async function loadStudent(id: number) {
  controller?.abort()
  controller = new AbortController()

  try {
    const response = await fetch(`${API_BASE_URL}/students/${id}`, {
      signal: controller.signal,
    })
    if (!response.ok) throw new Error('학생 정보를 불러오지 못했습니다.')
    student.value = await response.json()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    throw error
  }
}

onUnmounted(() => controller?.abort())
```

### 19.6 환경 변수

프로젝트 루트의 `.env.development` 예:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api
```

코드:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
```

- 브라우저에서 읽어야 하는 Vite 환경 변수는 `VITE_`로 시작한다.
- API 비밀번호나 비밀키를 프론트엔드 환경 변수에 넣지 않는다. 빌드된 코드에서 사용자가 확인할 수 있다.
- `.env` 파일의 저장소 포함 여부는 팀 정책에 따른다. 보통 실제 비밀값은 제외하고 `.env.example`만 공유한다.

### 19.7 API 응답 타입을 그대로 믿지 않기

`as Student`는 서버 데이터가 실제로 Student인지 검사하지 않는다. 중요한 서비스에서는 Zod 같은 검증 라이브러리 또는 직접 작성한 타입 가드로 런타임 검증을 고려한다.

```ts
function isStudent(value: unknown): value is Student {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'number' && typeof candidate.name === 'string'
}
```

---

## 20. 폼 검증과 사용자 피드백

### 20.1 HTML 기본 검증부터 사용하기

```html
<input v-model.trim="form.name" required minlength="2" maxlength="20" />
<input v-model="form.email" type="email" />
<input v-model.number="form.age" type="number" min="5" max="19" />
```

### 20.2 Vue에서 검증 메시지 만들기

```ts
interface FormErrors {
  name?: string
  guardianPhone?: string
}

const errors = reactive<FormErrors>({})

function validateForm() {
  errors.name = undefined
  errors.guardianPhone = undefined

  if (form.name.trim().length < 2) {
    errors.name = '학생 이름을 두 글자 이상 입력해 주세요.'
  }

  if (!/^010-\d{4}-\d{4}$/.test(form.guardianPhone)) {
    errors.guardianPhone = '010-0000-0000 형식으로 입력해 주세요.'
  }

  return !errors.name && !errors.guardianPhone
}
```

```vue
<div class="field" :class="{ 'field--error': errors.name }">
  <label for="student-name">학생 이름</label>
  <input
    id="student-name"
    v-model.trim="form.name"
    class="input"
    :aria-invalid="Boolean(errors.name)"
    aria-describedby="student-name-error"
  />
  <p v-if="errors.name" id="student-name-error" class="field__error">
    {{ errors.name }}
  </p>
</div>
```

```css
.field--error .input {
  border-color: var(--danger-600);
}

.field__error {
  margin: 0;
  color: var(--danger-600);
  font-size: 12px;
}
```

### 20.3 저장 중 중복 제출 막기

```ts
const isSubmitting = ref(false)

async function submitForm() {
  if (isSubmitting.value || !validateForm()) return

  isSubmitting.value = true
  try {
    await createStudent({ ...form })
    await router.push({ name: 'teacher-dashboard' })
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
```

```html
<button class="button" type="submit" :disabled="isSubmitting">
  {{ isSubmitting ? '저장 중…' : '학생 등록' }}
</button>
```

비활성 버튼은 CSS로도 상태를 보여 준다.

```css
.button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}
```

### 20.4 삭제 확인

브라우저 `window.confirm`은 목업에는 빠르지만 실제 서비스에서는 접근 가능한 공통 확인 모달을 만드는 편이 디자인과 동작을 통일하기 좋다.

삭제 흐름:

1. 사용자가 삭제 버튼 클릭
2. 어떤 학생이 삭제되는지 명확한 확인 문구 표시
3. 확인 시 DELETE 요청
4. 성공하면 목록에서 제거하거나 목록 재조회
5. 실패하면 오류 안내
6. 취소하면 아무 변경도 하지 않음

---

## 21. 검색, 정렬, 페이지네이션 구현

### 21.1 클라이언트 검색

데이터가 적을 때 현재 대시보드처럼 브라우저에서 필터링한다.

```ts
const query = ref('')
const ageFilter = ref<number | 'all'>('all')

const filteredStudents = computed(() => {
  const keyword = query.value.trim().toLowerCase()

  return students.value.filter((student) => {
    const matchesKeyword =
      student.name.toLowerCase().includes(keyword) || student.school.toLowerCase().includes(keyword)
    const matchesAge = ageFilter.value === 'all' || student.age === ageFilter.value
    return matchesKeyword && matchesAge
  })
})
```

### 21.2 정렬

```ts
type SortKey = 'name' | 'age' | 'lastTestDate'
type SortDirection = 'asc' | 'desc'

const sortKey = ref<SortKey>('name')
const sortDirection = ref<SortDirection>('asc')

const sortedStudents = computed(() => {
  const direction = sortDirection.value === 'asc' ? 1 : -1

  return filteredStudents.value.toSorted((a, b) => {
    if (sortKey.value === 'name') {
      return a.name.localeCompare(b.name, 'ko') * direction
    }
    if (sortKey.value === 'age') {
      return (a.age - b.age) * direction
    }
    return a.lastTestDate.localeCompare(b.lastTestDate) * direction
  })
})
```

날짜 문자열은 반드시 `YYYY-MM-DD`처럼 정렬 가능한 형식인지 확인한다.

### 21.3 클라이언트 페이지네이션

```ts
const page = ref(1)
const pageSize = ref(10)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(sortedStudents.value.length / pageSize.value)),
)

const paginatedStudents = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedStudents.value.slice(start, start + pageSize.value)
})

watch([query, ageFilter, sortKey, sortDirection, pageSize], () => {
  page.value = 1
})
```

### 21.4 서버 페이지네이션

데이터가 많으면 전체를 받은 뒤 자르지 않고 서버에 조건을 보낸다.

```ts
const params = new URLSearchParams({
  page: String(page.value),
  size: String(pageSize.value),
  query: query.value,
  sort: `${sortKey.value},${sortDirection.value}`,
})

const response = await fetch(`${API_BASE_URL}/students?${params}`)
```

백엔드와 다음 응답 형태를 합의한다.

```ts
interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
```

### 21.5 검색 디바운스

사용자가 한 글자 입력할 때마다 API를 호출하지 않고 잠시 입력이 멈춘 후 호출한다.

```ts
let searchTimer: ReturnType<typeof window.setTimeout> | undefined

watch(query, () => {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    loadStudents()
  }, 300)
})

onUnmounted(() => {
  if (searchTimer) window.clearTimeout(searchTimer)
})
```

여러 화면에서 필요하면 `useDebouncedRef` composable로 분리한다.

---

## 22. ECharts 사용 가이드

### 22.1 기본 option 구조

```ts
const option: EChartsOption = {
  tooltip: { trigger: 'axis' },
  legend: { data: ['정확도', '유창성'] },
  grid: { left: 48, right: 24, top: 48, bottom: 36 },
  xAxis: {
    type: 'category',
    data: ['1주', '2주', '3주'],
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
  },
  series: [
    { name: '정확도', type: 'line', data: [60, 72, 84] },
    { name: '유창성', type: 'line', data: [52, 66, 78] },
  ],
}
```

- `tooltip`: 마우스를 올렸을 때 정보
- `legend`: 여러 데이터 계열 이름
- `grid`: 차트 내부 여백
- `xAxis`, `yAxis`: 가로/세로축
- `series`: 실제 선, 막대 등의 데이터 묶음

### 22.2 선 그래프와 막대그래프 선택

- 시간에 따른 변화: 선 그래프
- 항목 사이 크기 비교: 막대그래프
- 두 값의 비중: 전체가 명확할 때만 파이 차트 고려
- 너무 많은 색과 3D 효과는 데이터 해석을 어렵게 한다.

### 22.3 데이터와 설정 분리

차트가 많아지면 ECharts의 `dataset`을 사용하면 데이터와 시각 설정을 분리하고 여러 series가 데이터를 공유하기 쉽다.

```ts
const option: EChartsOption = {
  legend: {},
  tooltip: {},
  dataset: {
    source: [
      ['week', '정확도', '유창성'],
      ['1주', 60, 52],
      ['2주', 72, 66],
      ['3주', 84, 78],
    ],
  },
  xAxis: { type: 'category' },
  yAxis: { type: 'value' },
  series: [{ type: 'line' }, { type: 'line' }],
}
```

### 22.4 반응형과 정리

`ChartPanel.vue`가 다음을 이미 처리한다.

- `nextTick` 후 실제 div 크기로 차트 생성
- `ResizeObserver`로 부모 크기 변화 감지
- option 변경 시 다시 그리기
- 컴포넌트 제거 시 `dispose`

따라서 View에서 직접 `echarts.init`을 반복하지 말고 `ChartPanel`을 사용한다.

### 22.5 차트 접근성

차트에는 반드시 내용을 설명하는 `aria-label`을 전달한다. 중요한 수치는 차트로만 제공하지 말고 요약 문구나 표로도 제공한다.

```vue
<ChartPanel
  :option="scoreChart"
  height="320px"
  aria-label="최근 3주 읽기 정확도가 60점에서 84점으로 상승한 선 그래프"
/>
```

---

## 23. 앞으로 자주 필요할 JavaScript와 브라우저 기능

### 23.1 날짜와 숫자 표시

```ts
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}
```

```ts
const numberFormatter = new Intl.NumberFormat('ko-KR')
numberFormatter.format(123456) // 123,456
```

날짜 문자열을 `new Date('2026-07-19')`로 바꿀 때 시간대 차이로 날짜가 달라질 수 있다. 날짜만 필요한 값은 백엔드 형식과 표시 방식을 명확히 합의한다.

### 23.2 localStorage

사용자 화면 설정처럼 민감하지 않은 작은 값을 브라우저에 유지할 수 있다.

```ts
const STORAGE_KEY = 'teacher-dashboard-filters'

localStorage.setItem(
  STORAGE_KEY,
  JSON.stringify({ ageFilter: ageFilter.value, pageSize: pageSize.value }),
)

const savedValue = localStorage.getItem(STORAGE_KEY)
if (savedValue) {
  const parsed = JSON.parse(savedValue) as { ageFilter: string; pageSize: number }
  ageFilter.value = parsed.ageFilter
  pageSize.value = parsed.pageSize
}
```

localStorage는 문자열만 저장한다. 개인정보, 비밀번호, 민감한 인증 정보를 저장하지 않는다.

### 23.3 파일 미리보기

현재 `StudentForm`과 `TeacherSettingsView`가 사용하는 방식이다.

```ts
const previewUrl = ref('/images/student-profile.png')

function selectImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errorMessage.value = '이미지 파일만 선택할 수 있습니다.'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = '5MB 이하 이미지를 선택해 주세요.'
    return
  }

  if (previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }

  previewUrl.value = URL.createObjectURL(file)
}

onUnmounted(() => {
  if (previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
```

미리보기 URL 생성은 서버 업로드가 아니다. 실제 업로드에는 보통 `FormData`를 사용한다.

```ts
const body = new FormData()
body.append('file', file)
await fetch(`${API_BASE_URL}/files`, { method: 'POST', body })
```

`FormData`를 보낼 때는 브라우저가 boundary를 설정하도록 `Content-Type` 헤더를 직접 지정하지 않는 것이 일반적이다.

### 23.4 안전한 오류 문구 함수

```ts
export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return '알 수 없는 오류가 발생했습니다.'
}
```

### 23.5 `Promise.all`

서로 의존하지 않는 여러 데이터를 함께 기다릴 수 있다.

```ts
const [student, curriculum, reports] = await Promise.all([
  getStudent(id),
  getCurriculum(id),
  getReports(id),
])
```

하나라도 실패하면 전체가 실패한다. 일부 실패를 허용해야 하면 `Promise.allSettled`를 고려한다.

---

## 24. 실습 1: 상태 배지 컴포넌트 만들기

목표: props, computed, 동적 class, scoped CSS를 연습한다.

### 24.1 파일 만들기

`src/components/common/StatusBadge.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'

type Status = 'active' | 'paused' | 'completed'

const props = defineProps<{
  status: Status
}>()

const label = computed(() => {
  const labels: Record<Status, string> = {
    active: '학습 중',
    paused: '일시 중지',
    completed: '완료',
  }
  return labels[props.status]
})
</script>

<template>
  <span class="status-badge" :class="`status-badge--${status}`">
    {{ label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-badge--active {
  background: #dcfce7;
  color: #166534;
}

.status-badge--paused {
  background: #ffedd5;
  color: #c2410c;
}

.status-badge--completed {
  background: var(--primary-50);
  color: var(--primary-700);
}
</style>
```

### 24.2 대시보드에서 사용

```ts
import StatusBadge from '@/components/common/StatusBadge.vue'
```

```vue
<StatusBadge status="active" />
```

### 24.3 확인할 내용

- 허용되지 않은 `status="unknown"`에 타입 오류가 나는가?
- 각 상태가 다른 색으로 보이는가?
- 다른 화면에서도 같은 컴포넌트를 재사용할 수 있는가?

### 24.4 확장 과제

- `size?: 'small' | 'medium'` props를 추가한다.
- 상태 앞에 작은 점을 표시한다.
- 색상뿐 아니라 텍스트로도 상태가 구별되는지 확인한다.

---

## 25. 실습 2: 학생 상담 기록 목록 화면 만들기

목표: View, 타입, 목업 데이터, 검색, 빈 상태, Router를 함께 연습한다.

### 25.1 타입을 별도 모듈에 추가

`src/features/teacher/types.ts`

```ts
export interface CounselingRecord {
  id: number
  studentId: number
  date: string
  counselor: string
  category: '학습' | '생활' | '보호자 상담'
  summary: string
}

// 등록과 수정 폼이 공통으로 사용할 입력 데이터 형태입니다.
export interface CounselingInput {
  date: string
  counselor: string
  category: '학습' | '생활' | '보호자 상담'
  summary: string
}
```

### 25.2 목업 데이터 추가

`src/features/teacher/mockData.ts`

```ts
import type { CounselingRecord } from './types'

export const counselingRecords: CounselingRecord[] = [
  {
    id: 1,
    studentId: 1,
    date: '2026-07-18',
    counselor: '이OO',
    category: '보호자 상담',
    summary: '최근 읽기 속도 향상과 다음 학습 방향을 안내했습니다.',
  },
  {
    id: 2,
    studentId: 1,
    date: '2026-07-11',
    counselor: '이OO',
    category: '학습',
    summary: '받침이 포함된 문장 반복 연습을 권장했습니다.',
  },
]
```

### 25.3 View 만들기

`src/views/teacher/StudentCounselingView.vue`

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { counselingRecords } from '@/features/teacher/mockData'

const query = ref('')

const filteredRecords = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return counselingRecords.filter((record) =>
    [record.counselor, record.category, record.summary].some((value) =>
      value.toLowerCase().includes(keyword),
    ),
  )
})
</script>

<template>
  <div class="counseling page-stack">
    <header class="page-heading">
      <div>
        <h1>상담 기록</h1>
        <p>학생 및 보호자 상담 내용을 날짜별로 확인합니다.</p>
      </div>
      <button class="button" type="button">＋ 상담 기록</button>
    </header>

    <section class="surface counseling-list">
      <div class="surface-header">
        <h2>전체 기록</h2>
        <input
          v-model="query"
          class="input counseling-search"
          type="search"
          placeholder="상담 내용 검색"
          aria-label="상담 기록 검색"
        />
      </div>

      <div v-if="filteredRecords.length === 0" class="empty-state">
        검색 조건에 맞는 상담 기록이 없습니다.
      </div>

      <ul v-else class="record-list">
        <li v-for="record in filteredRecords" :key="record.id">
          <div>
            <span class="record-category">{{ record.category }}</span>
            <strong>{{ record.summary }}</strong>
            <p>{{ record.date }} · {{ record.counselor }}</p>
          </div>
          <button class="button button--secondary button--small" type="button">상세 보기</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.counseling-search {
  width: 240px;
}

.record-list {
  display: grid;
  margin: 0;
  padding: 0 22px;
  list-style: none;
}

.record-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 0;
  border-bottom: 1px solid var(--slate-200);
}

.record-list li:last-child {
  border-bottom: 0;
}

.record-list strong {
  display: block;
  margin-top: 8px;
}

.record-list p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}

.record-category {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 11px;
  font-weight: 700;
}

.empty-state {
  padding: 56px 24px;
  color: var(--slate-500);
  text-align: center;
}
</style>
```

### 25.4 라우터와 탭 연결

`src/router/index.ts`의 학생 하위 라우트:

```ts
{
  path: 'counseling',
  name: 'student-counseling',
  component: () => import('@/views/teacher/StudentCounselingView.vue'),
}
```

`StudentTabs.vue`:

```ts
{ label: '상담 기록', name: 'student-counseling' }
```

### 25.5 확인 순서

1. `/teacher/students/1/counseling` 주소가 열리는지 확인한다.
2. 탭을 클릭해 새로고침 없이 이동하는지 확인한다.
3. 검색어를 입력하면 목록이 줄어드는지 확인한다.
4. 결과가 없을 때 빈 상태가 보이는지 확인한다.
5. `pnpm type-check`와 `pnpm build`를 실행한다.

---

## 26. 실습 3: 상담 기록 등록 폼 만들기

목표: 재사용 폼, emits, 검증, 저장 상태, 화면 이동을 연습한다.

### 26.1 폼 컴포넌트

`src/components/teacher/CounselingForm.vue`

```vue
<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { CounselingInput } from '@/features/teacher/types'

const emit = defineEmits<{
  submit: [value: CounselingInput]
  cancel: []
}>()

const form = reactive<CounselingInput>({
  date: '',
  counselor: '',
  category: '학습',
  summary: '',
})

const isValid = computed(() =>
  Boolean(form.date && form.counselor.trim() && form.summary.trim().length >= 10),
)

function submitForm() {
  if (!isValid.value) return
  emit('submit', { ...form })
}
</script>

<template>
  <form class="surface counseling-form" @submit.prevent="submitForm">
    <div class="form-grid">
      <div class="field">
        <label for="counseling-date">상담일</label>
        <input id="counseling-date" v-model="form.date" class="input" type="date" required />
      </div>

      <div class="field">
        <label for="counselor">상담자</label>
        <input id="counselor" v-model.trim="form.counselor" class="input" required />
      </div>

      <div class="field form-grid__wide">
        <label for="category">상담 유형</label>
        <select id="category" v-model="form.category" class="select">
          <option>학습</option>
          <option>생활</option>
          <option>보호자 상담</option>
        </select>
      </div>

      <div class="field form-grid__wide">
        <label for="summary">상담 내용</label>
        <textarea
          id="summary"
          v-model.trim="form.summary"
          class="textarea"
          minlength="10"
          required
        ></textarea>
        <small>{{ form.summary.length }}자 · 최소 10자</small>
      </div>
    </div>

    <footer class="form-actions">
      <button class="button button--secondary" type="button" @click="emit('cancel')">취소</button>
      <button class="button" type="submit" :disabled="!isValid">저장</button>
    </footer>
  </form>
</template>

<style scoped>
.counseling-form {
  padding: 24px;
}

.form-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid__wide {
  grid-column: 1 / -1;
}

.field small {
  color: var(--slate-500);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}
</style>
```

### 26.2 등록 View

`src/views/teacher/StudentCounselingCreateView.vue`

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import CounselingForm from '@/components/teacher/CounselingForm.vue'
import type { CounselingInput } from '@/features/teacher/types'

const router = useRouter()
const isSubmitting = ref(false)
const errorMessage = ref('')

async function createRecord(value: CounselingInput) {
  if (isSubmitting.value) return
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // 실제 API 함수가 준비되면 value를 전달한다.
    console.log(value)
    await router.push({ name: 'student-counseling', params: { id: 1 } })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '저장하지 못했습니다.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <div>
        <h1>상담 기록 등록</h1>
        <p>학생 또는 보호자와 진행한 상담 내용을 기록합니다.</p>
      </div>
    </header>

    <div v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</div>
    <CounselingForm @submit="createRecord" @cancel="router.back()" />
  </div>
</template>

<style scoped>
.error-message {
  padding: 11px 14px;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  background: #fff1f2;
  color: var(--danger-600);
  font-weight: 600;
}
</style>
```

폼과 View가 `types.ts`의 같은 `CounselingInput`을 가져오므로 두 파일의 입력 형태가 어긋나면 TypeScript가 알려 준다. 공통 데이터 설계도를 별도 모듈에 두는 이유다.

### 26.3 확장 과제

- 등록 중 폼 전체를 비활성화한다.
- 실패 안내에 다시 시도 버튼을 추가한다.
- 수정 모드를 추가하고 등록/수정 폼을 공유한다.
- 상세 보기 화면을 만든다.
- 실제 API service와 연결한다.

---

## 27. 새 화면을 만드는 표준 작업 순서

### 27.1 구현 전

1. 화면의 목적을 한 문장으로 쓴다.
2. 표시할 데이터 항목을 목록으로 만든다.
3. URL이 필요한 View인지, 재사용 컴포넌트인지 결정한다.
4. 가장 비슷한 기존 화면을 찾는다.
5. 로딩, 오류, 빈 데이터, 정상 데이터 상태를 정의한다.
6. 백엔드 API가 있다면 요청/응답 예시와 오류 코드를 확인한다.

### 27.2 구현 순서

1. TypeScript interface 작성
2. 목업 데이터 또는 service 함수 작성
3. 최소 template 구조 작성
4. `ref`, `computed`, 이벤트 함수 연결
5. 기존 공통 CSS 클래스로 기본 모양 구성
6. 해당 화면만의 scoped CSS 추가
7. Router 등록
8. 키보드와 빈 상태 확인
9. 타입 검사와 빌드

### 27.3 완료 기준

- 정상 데이터가 보인다.
- 데이터가 0개일 때 안내가 보인다.
- 로딩과 실패 상태가 구별된다.
- 버튼을 여러 번 눌러도 중복 요청이 발생하지 않는다.
- 목록 항목에는 안정적인 `key`가 있다.
- 폼의 label과 input이 연결되어 있다.
- 아이콘 버튼에는 이름이 있다.
- 긴 문구가 레이아웃을 깨뜨리지 않는다.
- 새로고침해도 URL에 맞는 화면이 열린다.
- 콘솔 오류가 없다.
- `pnpm type-check`, `pnpm lint`, `pnpm build`가 통과한다.

---

## 28. 디버깅 방법

### 28.1 오류를 읽는 순서

1. 터미널 또는 브라우저 콘솔의 첫 번째 오류를 찾는다.
2. 파일 경로와 줄 번호를 확인한다.
3. 오류 문장의 “무엇이 기대되었고 실제로 무엇이 왔는지”를 찾는다.
4. 한 번에 하나만 수정한다.
5. 같은 검사를 다시 실행한다.

뒤쪽 오류는 첫 오류 때문에 연쇄적으로 발생했을 수 있다.

### 28.2 자주 만나는 Vue 오류

#### `Property 'xxx' does not exist`

원인 후보:

- 변수 이름 오타
- script에 선언하지 않은 값을 template에서 사용
- `v-for` 범위 밖에서 반복 변수 사용
- HTML 주석을 여러 줄 태그의 속성 사이에 작성

```vue
<!-- 잘못된 위치 -->
<button
  <!-- 설명 -->
  v-for="item in items"
>
```

```vue
<!-- 올바른 위치 -->
<!-- items를 반복 출력합니다. -->
<button v-for="item in items">
```

#### `Object is possibly 'undefined'`

값을 못 찾을 가능성을 처리한다.

```ts
const student = students.find((item) => item.id === id)
if (!student) return
console.log(student.name)
```

#### 화면 값이 바뀌지 않음

- 일반 변수인지 `ref`/`reactive`인지 확인
- script에서 ref를 변경할 때 `.value`를 썼는지 확인
- props를 직접 변경하고 있지 않은지 확인
- 배열을 잘못 복사하거나 원본과 다른 배열을 보고 있지 않은지 확인

#### `v-for` 경고

고유한 `:key`를 제공한다.

```html
<li v-for="student in students" :key="student.id"></li>
```

### 28.3 CSS가 적용되지 않을 때

1. 개발자 도구 Elements에서 원하는 class가 실제로 붙었는지 확인한다.
2. Styles에서 규칙이 취소선인지 확인한다.
3. selector 오타와 scoped 범위를 확인한다.
4. 부모의 `overflow: hidden` 때문에 잘린 것인지 확인한다.
5. Grid/Flex 자식의 `min-width: 0`이 필요한지 확인한다.
6. 색상 변수 이름이 실제 `:root`에 존재하는지 확인한다.

### 28.4 네트워크 오류

브라우저 개발자 도구 Network에서 다음을 본다.

- 요청 URL
- HTTP method
- status code
- request payload
- response body
- CORS 오류 여부

대표 상태 코드:

- `200`: 조회 성공
- `201`: 생성 성공
- `204`: 본문 없는 성공
- `400`: 잘못된 입력
- `401`: 인증 필요
- `403`: 권한 없음
- `404`: 데이터 또는 주소 없음
- `409`: 중복 등 상태 충돌
- `500`: 서버 내부 오류

### 28.5 임시 로그

```ts
console.log('student id', route.params.id)
console.table(students.value)
console.error(error)
```

문제를 해결한 뒤 불필요한 로그는 제거한다. 개인정보와 인증 토큰은 로그에 출력하지 않는다.

---

## 29. 코드 품질과 모듈화 기준

### 29.1 한 함수는 한 가지 역할

```ts
// 너무 많은 역할: 검증 + 요청 + 안내 + 이동이 뒤섞임
async function submit() {}
```

다음처럼 역할을 나눌 수 있다.

```ts
function validateStudent() {}
async function requestCreateStudent() {}
function handleCreateSuccess() {}
async function submitStudent() {}
```

짧게 나누는 것 자체가 목적은 아니다. 함수 이름으로 동작을 이해할 수 있게 만드는 것이 목적이다.

### 29.2 template을 단순하게 유지

```html
<!-- 복잡함 -->
{{ students.filter((student) => student.age >= 10).map((student) => student.name).join(', ') }}
```

```ts
const studentNames = computed(() =>
  students.value
    .filter((student) => student.age >= 10)
    .map((student) => student.name)
    .join(', '),
)
```

```html
{{ studentNames }}
```

### 29.3 하드코딩을 줄이기

여러 곳에서 같은 숫자나 문구가 반복되면 이름을 붙인다.

```ts
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const NOTICE_DURATION = 2200
```

색상과 간격은 CSS 변수로 관리한다.

### 29.4 주석 작성 원칙

좋은 주석은 코드만으로 알기 어려운 이유와 제약을 설명한다.

```ts
// API 검색 요청이 매 입력마다 발생하지 않도록 300ms 기다립니다.
```

코드 내용을 그대로 반복하는 주석은 유지 비용만 늘릴 수 있다.

```ts
// page에 1을 더합니다.
page.value += 1
```

이 프로젝트의 교육용 상세 주석은 학습 목적이므로 일반 제품 코드보다 많다. 익숙해진 뒤에는 함수와 변수 이름만으로 분명한 부분의 주석을 줄이고, 중요한 의사결정과 예외 조건을 남긴다.

### 29.5 파일이 커질 때 분리 신호

- script에서 서로 관계없는 상태 묶음이 세 개 이상 보인다.
- template에서 독립적인 카드가 여러 개 반복된다.
- scoped CSS에서 서로 다른 영역의 접두사가 많이 나타난다.
- 같은 함수와 스타일을 다른 화면에 복사하기 시작했다.
- 파일에서 원하는 부분을 찾는 데 오래 걸린다.

---

## 30. Git을 이용한 안전한 작업 습관

이 프로젝트가 Git 저장소로 관리될 때의 권장 흐름이다.

```powershell
git status
git switch -c feature/student-counseling

# 작업 후
git diff
pnpm type-check
pnpm build
git add src
git commit -m "feat: add student counseling view"
```

- 기능 하나당 작은 브랜치와 작은 커밋을 만든다.
- `node_modules`, `dist`, 실제 비밀값이 있는 `.env`는 일반적으로 커밋하지 않는다.
- 자동 수정 명령 실행 전 `git status`로 기존 변경을 확인한다.
- 다른 사람이 수정한 내용을 임의로 되돌리지 않는다.
- 커밋 메시지는 무엇을 왜 바꿨는지 찾을 수 있게 작성한다.

---

## 31. 빠른 참고표

### 31.1 Vue 문법

| 목적                  | 문법                             |
| --------------------- | -------------------------------- |
| 변경 가능한 단일 상태 | `const value = ref('')`          |
| 객체 폼 상태          | `const form = reactive({...})`   |
| 상태로부터 계산       | `computed(() => ...)`            |
| 변경 시 부수 효과     | `watch(source, callback)`        |
| 화면 부착 후 실행     | `onMounted(callback)`            |
| 화면 제거 시 정리     | `onUnmounted(callback)`          |
| 부모 입력             | `defineProps<{...}>()`           |
| 부모에게 이벤트       | `defineEmits<{...}>()`           |
| 조건 표시             | `v-if`, `v-else-if`, `v-else`    |
| 목록 반복             | `v-for="item in items"`          |
| 입력 양방향 연결      | `v-model`                        |
| 동적 속성             | `:disabled="condition"`          |
| 동적 class            | `:class="{ active: condition }"` |
| 클릭 이벤트           | `@click="handler"`               |
| 제출 새로고침 방지    | `@submit.prevent="handler"`      |

### 31.2 배열 메서드

| 목적                   | 메서드      |
| ---------------------- | ----------- |
| 모든 항목 변환         | `map`       |
| 조건에 맞는 목록       | `filter`    |
| 첫 번째 항목 찾기      | `find`      |
| 첫 번째 위치 찾기      | `findIndex` |
| 하나라도 만족          | `some`      |
| 모두 만족              | `every`     |
| 합계/요약              | `reduce`    |
| 원본 유지 정렬         | `toSorted`  |
| 배열 일부 잘라 새 배열 | `slice`     |
| 끝에 추가              | `push`      |

### 31.3 CSS 배치

| 목적             | 핵심 속성                                  |
| ---------------- | ------------------------------------------ |
| 한 줄 정렬       | `display: flex`                            |
| 행과 열 배치     | `display: grid`                            |
| 자식 사이 간격   | `gap`                                      |
| 가로 방향 정렬   | `justify-content`                          |
| 세로/교차축 정렬 | `align-items`                              |
| 남은 공간 비율   | `1fr`                                      |
| 전체 열 차지     | `grid-column: 1 / -1`                      |
| 넘치는 표 스크롤 | `overflow-x: auto`                         |
| 긴 한 줄 말줄임  | `overflow`, `text-overflow`, `white-space` |
| 스크롤 중 고정   | `position: sticky`                         |
| 부모 기준 띄우기 | 부모 `relative`, 자식 `absolute`           |

### 31.4 화면 상태 체크

```text
isLoading = true       → 로딩 표시
errorMessage 존재      → 오류와 재시도
items.length === 0     → 빈 데이터 안내
그 외                  → 정상 콘텐츠
isSubmitting = true    → 제출 버튼 비활성화
```

---

## 32. 용어 사전

| 용어        | 뜻                                                                        |
| ----------- | ------------------------------------------------------------------------- |
| 컴포넌트    | 재사용 가능한 Vue UI 단위                                                 |
| View        | URL에 연결되는 페이지 컴포넌트                                            |
| 레이아웃    | 여러 View가 공유하는 큰 화면 골격                                         |
| props       | 부모가 자식 컴포넌트에 주는 입력값                                        |
| emit        | 자식이 부모에게 알리는 이벤트                                             |
| slot        | 부모가 자식 컴포넌트 내부를 채우는 자리                                   |
| 반응형 상태 | 변경되면 Vue 화면도 갱신되는 값                                           |
| composable  | 상태가 있는 재사용 Vue 로직 함수                                          |
| directive   | `v-if`, `v-for` 같은 Vue 전용 template 지시문                             |
| route       | URL과 화면의 연결 규칙                                                    |
| params      | `/students/:id`에서 id 같은 동적 주소 값                                  |
| query       | `?page=2`처럼 URL 뒤에 붙는 검색 조건                                     |
| API         | 프론트엔드와 서버가 데이터를 주고받는 규칙                                |
| Promise     | 나중에 완료될 비동기 작업의 결과                                          |
| interface   | TypeScript 객체 형태 설계도                                               |
| 빌드        | 소스 코드를 배포 가능한 파일로 변환하는 과정                              |
| lint        | 코드 규칙과 잠재적 오류를 검사하는 과정                                   |
| HMR         | 개발 중 저장한 파일 변경을 빠르게 화면에 반영하는 기능                    |
| DOM         | 브라우저가 HTML을 객체 구조로 표현한 것                                   |
| 접근성      | 다양한 능력과 입력 방법을 가진 사용자가 서비스를 이용할 수 있게 하는 품질 |

---

## 33. 공식 문서 참고 링크

기능이 이 문서의 예제보다 복잡해지면 블로그의 오래된 코드보다 아래 공식 문서를 우선 확인한다.

### Vue

- [Vue 소개](https://vuejs.org/guide/introduction)
- [컴포넌트 기초](https://vuejs.org/guide/essentials/component-basics)
- [`<script setup>`](https://vuejs.org/api/sfc-script-setup.html)
- [반응성 기초](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [계산된 속성](https://vuejs.org/guide/essentials/computed.html)
- [조건부 렌더링](https://vuejs.org/guide/essentials/conditional.html)
- [목록 렌더링](https://vuejs.org/guide/essentials/list.html)
- [폼 입력 연결](https://vuejs.org/guide/essentials/forms.html)
- [watch](https://vuejs.org/guide/essentials/watchers.html)
- [생명주기](https://vuejs.org/guide/essentials/lifecycle.html)
- [composable](https://vuejs.org/guide/reusability/composables.html)

### Vue Router

- [동적 라우트](https://router.vuejs.org/guide/essentials/dynamic-matching.html)
- [중첩 라우트](https://router.vuejs.org/guide/essentials/nested-routes.html)
- [프로그래밍 방식 이동](https://router.vuejs.org/guide/essentials/navigation.html)
- [Navigation Guard](https://router.vuejs.org/guide/advanced/navigation-guards.html)

### TypeScript와 JavaScript

- [TypeScript 일상적인 타입](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript 함수](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [TypeScript 객체 타입](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [JavaScript Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [Fetch API 사용법](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

### HTML과 CSS

- [의미 있는 HTML 문서 구조](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Structuring_documents)
- [HTML 폼과 버튼](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/HTML_forms)
- [HTML 접근성 기초](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML)
- [Flexbox 기초](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts)
- [Grid 기초](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Basic_concepts)
- [미디어 쿼리](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Media_queries)

### 빌드와 차트

- [Vite 시작하기](https://vite.dev/guide/)
- [Vite 프로덕션 빌드](https://vite.dev/guide/build)
- [Vite 정적 파일 처리](https://vite.dev/guide/assets.html)
- [ECharts dataset](https://echarts.apache.org/handbook/en/concepts/dataset/)

---

## 34. 마지막 원칙

1. 처음부터 완벽한 화면을 만들려고 하지 말고 HTML 구조부터 만든다.
2. 화면에 표시할 데이터의 TypeScript 형태를 먼저 정의한다.
3. 원본 데이터와 계산 결과를 분리하고, 계산 결과는 `computed`를 사용한다.
4. 사용자 동작은 이름 있는 함수로 만든다.
5. 반복되는 UI는 컴포넌트, 반복되는 상태 로직은 composable로 분리한다.
6. 서버 요청은 service 모듈로 분리한다.
7. 기존 CSS 변수와 공통 클래스를 먼저 재사용한다.
8. 정상 상태뿐 아니라 로딩, 실패, 빈 데이터 상태를 함께 만든다.
9. 의미 있는 HTML과 키보드 접근성을 처음부터 지킨다.
10. 작은 변경마다 브라우저, 타입 검사, 빌드로 확인한다.

프론트엔드 개발은 많은 문법을 외우는 일이 아니라, 화면을 데이터·상태·컴포넌트·스타일의 작은 문제로 나누고 하나씩 검증하는 과정이다.
