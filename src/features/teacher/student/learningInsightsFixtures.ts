import type {
  StudentAccuracyPoint,
  StudentLearningEvent,
  StudentLearningEventDetail,
  StudentReadingSpeedPoint,
  StudentTrainingHistoryItem,
} from './model'
import type { StudentFixtureRecord } from './fixtures'

export interface StudentLearningInsightsFixture {
  readonly events: readonly StudentLearningEvent[]
  readonly eventDetails: readonly StudentLearningEventDetail[]
  readonly accuracy: readonly StudentAccuracyPoint[]
  readonly readingSpeed: readonly StudentReadingSpeedPoint[]
  readonly trainingHistory: readonly StudentTrainingHistoryItem[]
}

const emptyFixture: StudentLearningInsightsFixture = {
  events: [],
  eventDetails: [],
  accuracy: [],
  readingSpeed: [],
  trainingHistory: [],
}

const studentOneEventDetails: readonly StudentLearningEventDetail[] = [
  {
    eventId: 1104,
    eventType: 'TRAINING',
    occurredAt: '2026-07-27T16:00:00+09:00',
    sourceId: 7104,
    accuracy: 68,
    retryCount: 2,
    problemSegments: ['받침 ㄹ 발음', '긴 문장 호흡'],
    attentionRequired: true,
    attentionReasons: ['LOW_ACCURACY'],
    recommendedTrainingTemplateId: 301,
    recommendedCurriculumUnitId: 31,
    recommendedCurriculumUnitName: '받침이 있는 문장 읽기',
    recommendationReason: '최근 6주 평균 정확도가 가장 낮은 영역의 다음 미완료 훈련입니다.',
    recommendedMinutes: 10,
    recommendedRepeatCount: 2,
  },
  {
    eventId: 1103,
    eventType: 'GAZE',
    occurredAt: '2026-07-26T15:20:00+09:00',
    sourceId: 7103,
    accuracy: null,
    retryCount: 1,
    problemSegments: [],
    attentionRequired: true,
    attentionReasons: ['GAZE_ANALYSIS_FAILED'],
    recommendedTrainingTemplateId: null,
    recommendedCurriculumUnitId: null,
    recommendedCurriculumUnitName: null,
    recommendationReason: null,
    recommendedMinutes: null,
    recommendedRepeatCount: null,
  },
  {
    eventId: 1102,
    eventType: 'STORY',
    occurredAt: '2026-07-24T14:10:00+09:00',
    sourceId: 7102,
    accuracy: 82,
    retryCount: 0,
    problemSegments: [],
    attentionRequired: false,
    attentionReasons: [],
    recommendedTrainingTemplateId: null,
    recommendedCurriculumUnitId: null,
    recommendedCurriculumUnitName: null,
    recommendationReason: null,
    recommendedMinutes: null,
    recommendedRepeatCount: null,
  },
  {
    eventId: 1101,
    eventType: 'TEST',
    occurredAt: '2026-07-20T11:00:00+09:00',
    sourceId: 7101,
    accuracy: 74,
    retryCount: 0,
    problemSegments: ['이어 읽기'],
    attentionRequired: false,
    attentionReasons: [],
    recommendedTrainingTemplateId: null,
    recommendedCurriculumUnitId: null,
    recommendedCurriculumUnitName: null,
    recommendationReason: null,
    recommendedMinutes: null,
    recommendedRepeatCount: null,
  },
]

const studentOneTrainingHistory: readonly StudentTrainingHistoryItem[] = [
  {
    trainingId: 9105,
    date: '2026-07-27',
    learningType: '받침이 있는 문장 읽기',
    startedAt: '2026-07-27T15:48:00+09:00',
    finishedAt: '2026-07-27T16:00:00+09:00',
    achievement: 68,
  },
  {
    trainingId: 9104,
    date: '2026-07-21',
    learningType: '문장 호흡 나누기',
    startedAt: '2026-07-21T16:10:00+09:00',
    finishedAt: '2026-07-21T16:20:00+09:00',
    achievement: 76,
  },
  {
    trainingId: 9103,
    date: '2026-07-05',
    learningType: '긴 문장 따라 읽기',
    startedAt: '2026-07-05T14:00:00+09:00',
    finishedAt: '2026-07-05T14:11:00+09:00',
    achievement: 73,
  },
  {
    trainingId: 9102,
    date: '2026-06-15',
    learningType: '문장 부호에 맞춰 읽기',
    startedAt: '2026-06-15T15:00:00+09:00',
    finishedAt: '2026-06-15T15:09:00+09:00',
    achievement: 70,
  },
  {
    trainingId: 9101,
    date: '2026-04-15',
    learningType: '짧은 문장 읽기',
    startedAt: '2026-04-15T15:00:00+09:00',
    finishedAt: '2026-04-15T15:08:00+09:00',
    achievement: 64,
  },
]

function toEvent(detail: StudentLearningEventDetail): StudentLearningEvent {
  return {
    eventId: detail.eventId,
    eventType: detail.eventType,
    occurredAt: detail.occurredAt,
    sourceId: detail.sourceId,
    accuracy: detail.accuracy,
    attentionRequired: detail.attentionRequired,
    attentionReasons: detail.attentionReasons,
  }
}

function studentOneFixture(): StudentLearningInsightsFixture {
  return {
    events: studentOneEventDetails.map(toEvent),
    eventDetails: studentOneEventDetails,
    accuracy: [
      { date: '2026-06-18', accuracy: 62 },
      { date: '2026-06-25', accuracy: 65 },
      { date: '2026-07-02', accuracy: 67 },
      { date: '2026-07-09', accuracy: 69 },
      { date: '2026-07-16', accuracy: 71 },
      { date: '2026-07-23', accuracy: 74 },
    ],
    readingSpeed: [
      { date: '2026-07-02', speed: 82 },
      { date: '2026-07-09', speed: 86 },
      { date: '2026-07-16', speed: 89 },
      { date: '2026-07-23', speed: 94 },
    ],
    trainingHistory: studentOneTrainingHistory,
  }
}

function genericFixture(student: StudentFixtureRecord): StudentLearningInsightsFixture {
  if (!student.recentLearningDate) return emptyFixture

  const eventId = student.studentId * 1000 + 1
  const accuracy = student.studentId === 2 ? 90 : Math.min(95, 70 + student.studentId)
  const eventType = student.studentId % 2 === 0 ? 'TRAINING' : 'TEST'
  const detail: StudentLearningEventDetail = {
    eventId,
    eventType,
    occurredAt: `${student.recentLearningDate}T16:00:00+09:00`,
    sourceId: student.studentId * 10_000 + 1,
    accuracy,
    retryCount: 0,
    problemSegments: [],
    attentionRequired: false,
    attentionReasons: [],
    recommendedTrainingTemplateId: null,
    recommendedCurriculumUnitId: null,
    recommendedCurriculumUnitName: null,
    recommendationReason: null,
    recommendedMinutes: null,
    recommendedRepeatCount: null,
  }
  return {
    events: [toEvent(detail)],
    eventDetails: [detail],
    accuracy:
      student.studentId === 2
        ? [{ date: student.recentLearningDate, accuracy }]
        : [
            { date: '2026-07-10', accuracy: Math.max(0, accuracy - 3) },
            { date: student.recentLearningDate, accuracy },
          ],
    readingSpeed: [
      {
        date: student.recentLearningDate,
        speed: 72 + student.studentId * 2,
      },
    ],
    trainingHistory: [
      {
        trainingId: student.studentId * 10_000 + 2,
        date: student.recentLearningDate,
        learningType: student.recentTraining ?? '읽기 훈련',
        startedAt: `${student.recentLearningDate}T15:50:00+09:00`,
        finishedAt: `${student.recentLearningDate}T16:00:00+09:00`,
        achievement: accuracy,
      },
    ],
  }
}

export function createLearningInsightsFixture(
  student: StudentFixtureRecord,
): StudentLearningInsightsFixture {
  return student.studentId === 1 ? studentOneFixture() : genericFixture(student)
}
