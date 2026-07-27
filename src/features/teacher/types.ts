// interface는 객체가 어떤 항목과 자료형을 가져야 하는지 정하는 '데이터 설계도'입니다.
// 실제 데이터는 만들지 않으며, 누락이나 잘못된 값은 개발 단계에서 찾도록 도와줍니다.
export interface Student {
  // id는 아동을 서로 구별하는 고유 번호입니다.
  id: number
  name: string
  // 등록된 프로필 이미지가 없으면 화면에서 이름 이니셜을 대신 표시합니다.
  profileImage?: string
  age: number
  birthDate: string
  // | 기호는 두 문자열 중 하나만 허용한다는 뜻입니다.
  gender: '남자' | '여자'
  phone: string
  school: string
  guardianName: string
  guardianRelation: string
  guardianPhone: string
  guardianEmail: string
  address: string
  lastLearningDate: string
  lastTestDate: string
  totalLearningTime: string
  latestTraining: string
  lastAccess: string
  learningStartDate: string
  weeklyAttendance: string
}

// 한 번의 훈련 기록에 필요한 데이터 형태입니다.
export interface TrainingSession {
  id: number
  title: string
  date: string
  achievement: number
  curriculum: string
  summary: string
  questions: Array<{
    questionNumber: number
    question: string | null
    correct: boolean
    selectedAnswer: string | null
    correctAnswer: string | null
  }>
}

export type ReportStatus = 'draft' | 'published'

export interface ReportVersion {
  id: number
  studentId: number
  version: number
  status: ReportStatus
  periodStart: string
  periodEnd: string
  teacherOpinion: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
}
