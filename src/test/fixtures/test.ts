import type { TestDetail, TestListItem, TestQuestionResult } from '@/features/teacher/test/model'

function questions(scores: readonly number[]): readonly TestQuestionResult[] {
  const tracks = [
    ['PHONOLOGICAL_AWARENESS', '음운 인식'],
    ['SHORT_TEXT', '짧은 글'],
    ['FLUENCY', '유창성'],
  ] as const
  return scores.map((score, index) => {
    const track = tracks[Math.floor(index / 3)]!
    const voice = index >= 6
    return {
      testId: String(11_001 + index),
      sequenceNo: index + 1,
      trackCode: track[0],
      questionType: voice ? 'VOICE' : index % 2 === 0 ? 'SINGLE_CHOICE' : 'DIRECT_INPUT',
      question: `${track[1]} ${index + 1}번 문항`,
      responseType: voice ? 'VOICE' : index % 2 === 0 ? 'SINGLE_CHOICE' : 'TEXT',
      selectedAnswer: score >= 80 ? `학습자 답 ${index + 1}` : `오답 ${index + 1}`,
      correctAnswer: `학습자 답 ${index + 1}`,
      correct: score >= 80,
      score,
      pronunciationScore: voice ? score : null,
      solvingTimeSeconds: index === 1 ? 0 : 12 + index,
      gazeDepartureCount: index === 2 ? 0 : index % 3,
    }
  })
}

function detail(
  id: string,
  completedAt: string,
  overallScore: number | null,
  scores: readonly number[],
  dailyCurriculumId: number | null = null,
): TestDetail {
  const questionResults = questions(scores).map((question) => ({
    ...question,
    testId: `${id}${question.sequenceNo}`,
  }))
  const areaScores = ['음운 인식', '짧은 글', '유창성'].map((title, index) => {
    const area = scores.slice(index * 3, index * 3 + 3)
    return {
      trackCode: ['PHONOLOGICAL_AWARENESS', 'SHORT_TEXT', 'FLUENCY'][index]!,
      title,
      score:
        area.length === 0
          ? null
          : Math.round((area.reduce((sum, value) => sum + value, 0) / area.length) * 10) / 10,
      completedQuestions: area.length,
      totalQuestions: 3,
    }
  })
  const gazeValues = questionResults
    .map((question) => question.gazeDepartureCount)
    .filter((value): value is number => value !== null)
  const pronunciationValues = questionResults
    .map((question) => question.pronunciationScore)
    .filter((value): value is number => value !== null)
  return {
    testCurriculumId: id,
    status: 'COMPLETED',
    createdAt: completedAt,
    completedAt,
    completedQuestions: scores.length,
    totalQuestions: scores.length,
    overallScore,
    areaScores,
    solvingTimeSeconds: questionResults.reduce(
      (sum, question) => sum + (question.solvingTimeSeconds ?? 0),
      0,
    ),
    gazeDepartureCount: gazeValues.reduce((sum, value) => sum + value, 0),
    pronunciationScore:
      pronunciationValues.length === 0
        ? null
        : Math.round(
            (pronunciationValues.reduce((sum, value) => sum + value, 0) /
              pronunciationValues.length) *
              10,
          ) / 10,
    questions: questionResults,
    recommendationStatus: dailyCurriculumId === null ? 'PENDING' : 'COMPLETED',
    recommendationError: null,
    recommendationLastAttemptAt: completedAt,
    recommendationRetryCount: 0,
    dailyCurriculumId,
    contentGenerationStatus: dailyCurriculumId === null ? null : 'NOT_STARTED',
    teacherReviewStatus: dailyCurriculumId === null ? null : 'REVIEW_REQUIRED',
  }
}

export const testDetailFixtures: readonly TestDetail[] = [
  detail('1011', '2026-07-24T10:30:00', 86, [100, 80, 80, 100, 60, 80, 90, 80, 84], 201),
  detail('1008', '2026-06-28T11:20:00', 78, [80, 80, 70, 80, 70, 80, 90, 70, 82], 189),
  detail('1005', '2026-05-30T09:10:00', 70, [60, 70, 80, 70, 60, 80, 70, 70, 70]),
  detail('1004', '2026-04-30T09:00:00', 0, [0, 0, 0, 0, 0, 0, 0, 0, 0]),
  detail('2001', '2026-07-18T13:00:00', 82, [80, 80, 90, 80, 80, 80, 90, 80, 78]),
]

function listItem(item: TestDetail): TestListItem {
  const {
    testCurriculumId,
    status,
    createdAt,
    completedAt,
    completedQuestions,
    totalQuestions,
    overallScore,
  } = item
  return {
    testCurriculumId,
    status,
    createdAt,
    completedAt,
    completedQuestions,
    totalQuestions,
    overallScore,
  }
}

export const testListFixtures: Readonly<Record<number, readonly TestListItem[]>> = {
  1: testDetailFixtures.slice(0, 4).map(listItem),
  2: [listItem(testDetailFixtures[4]!)],
  3: [],
}
