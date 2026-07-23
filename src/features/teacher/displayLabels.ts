import type {
  Audience,
  LearningEventStatus,
  LearningEventType,
  MessageSource,
  ReportStatus,
} from './types'

export const audienceLabels = {
  'teacher-only': '교수자만 확인',
  child: '아동에게 전달',
  guardian: '보호자에게 공유',
} satisfies Record<Audience, string>

export const messageSourceLabels = {
  teacher: '교수자',
  guardian: '보호자',
} satisfies Record<MessageSource, string>

export const learningEventTypeLabels = {
  'pronunciation-correction': '발음 교정 필요',
  'speech-recognition-low-confidence': '음성 인식 어려움',
  'device-or-network-error': '기기·통신 오류',
  'safety-restriction': '안전 제한',
  'generation-failure': '생성 실패',
} satisfies Record<LearningEventType, string>

export const learningEventStatusLabels = {
  'needs-review': '확인 필요',
  reviewed: '확인 완료',
  'follow-up-needed': '후속 지도 필요',
} satisfies Record<LearningEventStatus, string>

export const reportStatusLabels = {
  draft: '초안',
  published: '발행됨',
} satisfies Record<ReportStatus, string>
