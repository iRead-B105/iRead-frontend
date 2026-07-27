import type {
  CurriculumLog,
  CurriculumTrainingLog,
  DailyCurriculum,
  ExpectedWord,
  TrainingCatalogItem,
  TrainingDetail,
  TrainingPeriod,
  TrainingStatistics,
} from './model'

export const trainingCatalogFixture: readonly TrainingCatalogItem[] = [
  {
    trainingTemplateId: 11,
    unitName: '음운 인식',
    sequence: 1,
    trainingName: '첫소리 구별하기',
    studentAchievementRate: null,
    form: {
      objective: '낱말의 첫소리를 듣고 같은 소리로 시작하는 낱말을 찾습니다.',
      questionType: '낱말 선택',
    },
  },
  {
    trainingTemplateId: 12,
    unitName: '파닉스',
    sequence: 2,
    trainingName: '받침 소리 구분',
    studentAchievementRate: 72,
    form: {
      objective: '받침이 있는 낱말을 정확하게 소리 내어 읽습니다.',
      questionType: '낱말 읽기',
    },
  },
  {
    trainingTemplateId: 13,
    unitName: '유창성',
    sequence: 3,
    trainingName: '짧은 문장 읽기',
    studentAchievementRate: 61,
    form: {
      objective: '짧은 문장을 의미 단위로 끊어 자연스럽게 읽습니다.',
      questionType: '문장 낭독',
    },
  },
  {
    trainingTemplateId: 14,
    unitName: '이해력',
    sequence: 4,
    trainingName: '핵심 내용 찾기',
    studentAchievementRate: 48,
    form: {
      objective: '짧은 글에서 중심 내용을 나타내는 문장을 찾습니다.',
      questionType: '선택형',
    },
  },
]

export const currentCurriculumFixture: DailyCurriculum = {
  curriculumId: 201,
  status: 'NOT_STARTED',
  trainings: [
    {
      trainingId: 101,
      trainingTemplateId: 12,
      sequence: 1,
      unitName: '파닉스',
      trainingName: '받침 소리 구분',
      status: 'NOT_STARTED',
    },
    {
      trainingId: 102,
      trainingTemplateId: 12,
      sequence: 2,
      unitName: '파닉스',
      trainingName: '받침 소리 구분',
      status: 'NOT_READY',
    },
    {
      trainingId: 103,
      trainingTemplateId: 13,
      sequence: 3,
      unitName: '유창성',
      trainingName: '짧은 문장 읽기',
      status: 'NOT_STARTED',
    },
  ],
}

export const trainingDetailFixtures: readonly TrainingDetail[] = [
  {
    trainingId: 101,
    trainingTemplateId: 12,
    name: '받침 소리 구분',
    form: trainingCatalogFixture[1]?.form ?? null,
    generatedData: {
      questions: [
        {
          questionId: 'q-101-1',
          problem: { targetText: '꽃, 낮, 옷' },
          answer: { correctText: '끝소리를 정확하게 읽어요.' },
        },
        {
          questionId: 'q-101-2',
          problem: { targetText: '밖에 꽃이 피었습니다.' },
          answer: { correctText: '받침을 살려 자연스럽게 읽어요.' },
        },
      ],
    },
    status: 'NOT_STARTED',
    startedAt: null,
    finishedAt: null,
    result: null,
    accuracy: null,
  },
  {
    trainingId: 102,
    trainingTemplateId: 12,
    name: '받침 소리 구분',
    form: trainingCatalogFixture[1]?.form ?? null,
    generatedData: null,
    status: 'NOT_READY',
    startedAt: null,
    finishedAt: null,
    result: null,
    accuracy: null,
  },
  {
    trainingId: 103,
    trainingTemplateId: 13,
    name: '짧은 문장 읽기',
    form: trainingCatalogFixture[2]?.form ?? null,
    generatedData: {
      questions: [
        {
          questionId: 'q-103-1',
          problem: { targetText: '노란 나비가 꽃밭 위를 천천히 날아갑니다.' },
          answer: { correctText: '의미 단위로 나누어 읽어요.' },
        },
      ],
    },
    status: 'NOT_STARTED',
    startedAt: null,
    finishedAt: null,
    result: null,
    accuracy: null,
  },
  {
    trainingId: 901,
    trainingTemplateId: 12,
    name: '받침 소리 구분',
    form: trainingCatalogFixture[1]?.form ?? null,
    generatedData: null,
    status: 'COMPLETED',
    startedAt: '2026-07-20T09:00:00+09:00',
    finishedAt: '2026-07-20T09:08:30+09:00',
    result: {
      learningAssessment: '받침 소리를 안정적으로 구분했습니다.',
      questions: [
        {
          questionNumber: 1,
          question: '다음 중 끝소리가 같은 낱말을 고르세요.',
          isCorrect: true,
          selectedAnswer: '꽃, 옷',
          correctAnswer: '꽃, 옷',
        },
        {
          questionNumber: 2,
          question: '‘낮’을 소리 내어 읽어 보세요.',
          isCorrect: false,
          selectedAnswer: '나',
          correctAnswer: '낟',
        },
      ],
    },
    accuracy: 80,
  },
  {
    trainingId: 902,
    trainingTemplateId: 13,
    name: '짧은 문장 읽기',
    form: trainingCatalogFixture[2]?.form ?? null,
    generatedData: null,
    status: 'COMPLETED',
    startedAt: '2026-07-20T09:10:00+09:00',
    finishedAt: '2026-07-20T09:14:00+09:00',
    result: {
      questions: [
        {
          questionNumber: 1,
          question: '문장을 의미 단위로 나누어 읽어 보세요.',
          isCorrect: true,
          selectedAnswer: '노란 나비가 / 꽃밭 위를 날아갑니다.',
          correctAnswer: '노란 나비가 / 꽃밭 위를 날아갑니다.',
        },
      ],
    },
    accuracy: 100,
  },
  {
    trainingId: 903,
    trainingTemplateId: 14,
    name: '핵심 내용 찾기',
    form: trainingCatalogFixture[3]?.form ?? null,
    generatedData: null,
    status: 'COMPLETED',
    startedAt: '2026-07-20T09:16:00+09:00',
    finishedAt: '2026-07-20T09:20:00+09:00',
    result: { questions: [] },
    accuracy: null,
  },
  {
    trainingId: 891,
    trainingTemplateId: 11,
    name: '첫소리 구별하기',
    form: trainingCatalogFixture[0]?.form ?? null,
    generatedData: null,
    status: 'COMPLETED',
    startedAt: '2026-07-05T10:00:00+09:00',
    finishedAt: '2026-07-05T10:05:00+09:00',
    result: {
      questions: [
        {
          questionNumber: 1,
          question: null,
          isCorrect: false,
          selectedAnswer: null,
          correctAnswer: '바다',
        },
      ],
    },
    accuracy: 0,
  },
  {
    trainingId: 801,
    trainingTemplateId: 11,
    name: '첫소리 구별하기',
    form: trainingCatalogFixture[0]?.form ?? null,
    generatedData: null,
    status: 'COMPLETED',
    startedAt: '2026-05-18T14:00:00+09:00',
    finishedAt: null,
    result: null,
    accuracy: null,
  },
]

export const expectedWordFixtures: Readonly<Record<number, readonly ExpectedWord[]>> = {
  101: [
    { wordId: 1001, wordName: '꽃' },
    { wordId: 1002, wordName: '낮' },
  ],
  102: [{ wordId: 1003, wordName: '옷' }],
  103: [],
}

const thirtyDayCurriculumLogs: readonly CurriculumLog[] = [
  {
    curriculumId: 190,
    date: '2026-07-20',
    achievement: 88.5,
    trainings: [
      { trainingId: 901, unitName: '파닉스', trainingName: '받침 소리 구분' },
      { trainingId: 902, unitName: '유창성', trainingName: '짧은 문장 읽기' },
      { trainingId: 903, unitName: '이해력', trainingName: '핵심 내용 찾기' },
    ],
  },
  {
    curriculumId: 189,
    date: '2026-07-05',
    achievement: 0,
    trainings: [
      { trainingId: 891, unitName: '음운 인식', trainingName: '첫소리 구별하기' },
    ],
  },
]

export const curriculumLogFixtures: Readonly<
  Record<number, Readonly<Record<TrainingPeriod, readonly CurriculumLog[]>>>
> = {
  1: {
    '30d': thirtyDayCurriculumLogs,
    '3m': [
      ...thirtyDayCurriculumLogs,
      {
        curriculumId: 180,
        date: '2026-05-18',
        achievement: null,
        trainings: [
          { trainingId: 801, unitName: '음운 인식', trainingName: '첫소리 구별하기' },
        ],
      },
    ],
  },
  2: {
    '30d': [],
    '3m': [],
  },
}

export const trainingLogFixtures: Readonly<Record<number, CurriculumTrainingLog>> = {
  190: {
    curriculumId: 190,
    trainings: [
      {
        trainingId: 901,
        trainingName: '받침 소리 구분',
        startedAt: '2026-07-20T09:00:00+09:00',
        finishedAt: '2026-07-20T09:08:30+09:00',
        accuracy: 80,
        questions: trainingDetailFixtures[3]?.result?.questions ?? [],
      },
      {
        trainingId: 902,
        trainingName: '짧은 문장 읽기',
        startedAt: '2026-07-20T09:10:00+09:00',
        finishedAt: '2026-07-20T09:14:00+09:00',
        accuracy: 100,
        questions: trainingDetailFixtures[4]?.result?.questions ?? [],
      },
      {
        trainingId: 903,
        trainingName: '핵심 내용 찾기',
        startedAt: '2026-07-20T09:16:00+09:00',
        finishedAt: '2026-07-20T09:20:00+09:00',
        accuracy: null,
        questions: [],
      },
    ],
  },
  189: {
    curriculumId: 189,
    trainings: [
      {
        trainingId: 891,
        trainingName: '첫소리 구별하기',
        startedAt: '2026-07-05T10:00:00+09:00',
        finishedAt: '2026-07-05T10:05:00+09:00',
        accuracy: 0,
        questions: trainingDetailFixtures[6]?.result?.questions ?? [],
      },
    ],
  },
  180: {
    curriculumId: 180,
    trainings: [
      {
        trainingId: 801,
        trainingName: '첫소리 구별하기',
        startedAt: '2026-05-18T14:00:00+09:00',
        finishedAt: null,
        accuracy: null,
        questions: [],
      },
    ],
  },
}

export const trainingStatisticsFixtures: Readonly<Record<string, TrainingStatistics>> = {
  '190:30d': {
    accuracyComparisons: [
      {
        trainingId: 901,
        trainingName: '받침 소리 구분',
        date: '2026-07-20',
        accuracy: 80,
        previousTrainingDate: '2026-07-05',
        previousAccuracy: 70,
      },
      {
        trainingId: 902,
        trainingName: '짧은 문장 읽기',
        date: '2026-07-20',
        accuracy: 100,
        previousTrainingDate: null,
        previousAccuracy: null,
      },
      {
        trainingId: 903,
        trainingName: '핵심 내용 찾기',
        date: '2026-07-20',
        accuracy: null,
        previousTrainingDate: null,
        previousAccuracy: null,
      },
    ],
    readingSpeedTrend: {
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: 16.36,
      points: [
        { trainingId: 891, date: '2026-07-05', speed: 55 },
        { trainingId: 901, date: '2026-07-20', speed: 64 },
      ],
    },
  },
  '190:3m': {
    accuracyComparisons: [
      {
        trainingId: 901,
        trainingName: '받침 소리 구분',
        date: '2026-07-20',
        accuracy: 80,
        previousTrainingDate: '2026-05-18',
        previousAccuracy: 60,
      },
    ],
    readingSpeedTrend: {
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: 33.33,
      points: [
        { trainingId: 801, date: '2026-05-18', speed: 48 },
        { trainingId: 891, date: '2026-07-05', speed: 55 },
        { trainingId: 901, date: '2026-07-20', speed: 64 },
      ],
    },
  },
  '189:30d': {
    accuracyComparisons: [
      {
        trainingId: 891,
        trainingName: '첫소리 구별하기',
        date: '2026-07-05',
        accuracy: 0,
        previousTrainingDate: null,
        previousAccuracy: null,
      },
    ],
    readingSpeedTrend: {
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: null,
      points: [{ trainingId: 891, date: '2026-07-05', speed: 55 }],
    },
  },
  '189:3m': {
    accuracyComparisons: [],
    readingSpeedTrend: {
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: 14.58,
      points: [
        { trainingId: 801, date: '2026-05-18', speed: 48 },
        { trainingId: 891, date: '2026-07-05', speed: 55 },
      ],
    },
  },
  '180:3m': {
    accuracyComparisons: [],
    readingSpeedTrend: {
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: null,
      points: [],
    },
  },
}
