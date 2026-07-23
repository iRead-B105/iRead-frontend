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

// 아동에게 배정된 커리큘럼 한 항목의 형태입니다.
export type LessonContentType = 'word' | 'sentence' | 'question'

export interface LessonContentItem {
  id: number
  type: LessonContentType
  label: string
  content: string
  answer: string
  hint: string
}

export interface LessonMaterial {
  duration: number
  objective: string
  teacherGuide: string
  childInstruction: string
  contentItems: LessonContentItem[]
  updatedAt: string
}

export interface CurriculumItem {
  id: number
  studentId: number
  category: string
  order: number
  title: string
  // 화면에서는 0~100 사이의 달성률 숫자로 사용합니다.
  achievement: number
  material: LessonMaterial
}

// 한 번의 훈련 기록에 필요한 데이터 형태입니다.
export interface TrainingSession {
  id: number
  title: string
  date: string
  achievement: number
  curriculum: string
  summary: string
}

export interface RecommendedCurriculumItem {
  id: number
  trainingId: number
  category: string
  title: string
  count: number
  // 다음 회차에 배정된 항목만 수정할 수 있도록 훈련 원본과 분리된 교안입니다.
  material?: LessonMaterial
}

export type Audience = 'teacher-only' | 'child' | 'guardian'

export type MessageSource = 'teacher' | 'guardian'

export type AsyncContentState = 'loading' | 'ready' | 'error'

export type LearningEventType =
  | 'pronunciation-correction'
  | 'speech-recognition-low-confidence'
  | 'device-or-network-error'
  | 'safety-restriction'
  | 'generation-failure'

export type LearningEventStatus = 'needs-review' | 'reviewed' | 'follow-up-needed'

export type EncouragementStatus =
  | 'pending-approval'
  | 'scheduled'
  | 'delivered'
  | 'seen-by-child'
  | 'on-hold'
  | 'archived'

export type ReportStatus = 'draft' | 'published' | 'shared' | 'share-ended'

export type ShareLinkStatus = 'active' | 'expired' | 'revoked'

export interface LearningRecord {
  id: number
  studentId: number
  occurredAt: string
  activity: string
  result: 'started' | 'completed'
  score?: number
  eventId?: number
}

export interface LearningEvent {
  id: number
  studentId: number
  recordId: number
  occurredAt: string
  storyTitle: string
  sceneTitle: string
  type: LearningEventType
  retryCount: number
  finalSucceeded: boolean
  usedSafeFallback: boolean
  learningOutcome: 'completed' | 'left'
  status: LearningEventStatus
  issueSegment?: string
  recognitionConfidence?: number
  systemResponse: string
  reviewedBy?: string
  reviewedAt?: string
}

export interface MessageBase<TStatus extends string> {
  id: number
  studentId: number
  source: MessageSource
  audience: Audience
  status: TStatus
  createdAt: string
  updatedAt: string
}

export interface TeacherNote extends MessageBase<'active' | 'archived'> {
  author: string
  text: string
}

export interface EncouragementMessage extends MessageBase<EncouragementStatus> {
  author: string
  originalText: string
  deliveryText: string
  deliveryTiming: 'immediate' | 'next-login'
  scheduledAt?: string
  deliveredAt?: string
  seenAt?: string
  approvedBy?: string
  approvedAt?: string
  holdReason?: string
  deliveryStatusPending?: boolean
}

export interface GuardianComment extends MessageBase<'unread' | 'read' | 'archived'> {
  author: string
  reportVersion: number
  text: string
  readAt?: string
}

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

export interface ShareLink {
  id: number
  reportVersionId: number
  status: ShareLinkStatus
  maskedUrl: string
  copyValue: string
  expiresAt: string
  createdAt: string
  firstViewedAt?: string
  lastViewedAt?: string
  pdfSavedAt?: string
  revokedAt?: string
  guardianAuthentication: 'not-attempted' | 'verified' | 'failed'
  guardianContactHint: string
}
