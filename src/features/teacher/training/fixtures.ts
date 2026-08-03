import type {
  CurriculumLog,
  CurriculumTrainingLog,
  DailyCurriculum,
  TrainingCatalogItem,
  TrainingDetail,
  TrainingPeriod,
  TrainingStatistics,
} from './model'

const trainingCatalogMetadata = [
  [1, '글자 따라 보기', 1, '모음 따라 보기'],
  [2, '글자 따라 보기', 2, '자음 따라 보기'],
  [3, '글자 따라 보기', 3, '음절 따라 보기'],
  [4, '소리 듣고 고르기', 1, '자음 소리 고르기'],
  [5, '소리 듣고 고르기', 2, '모음 소리 고르기'],
  [6, '소리 듣고 고르기', 3, '자음·모음 구별하기'],
  [7, '소리 듣고 고르기', 4, '음절의 첫소리 찾기'],
  [8, '소리 듣고 고르기', 5, '낱말의 첫소리 찾기'],
  [9, '소리 듣고 고르기', 6, '같은 첫소리 낱말 찾기'],
  [10, '소리 듣고 고르기', 7, '받침 소리 고르기'],
  [11, '소리 듣고 고르기', 8, '낱말의 끝소리 고르기'],
  [12, '소리 듣고 고르기', 9, '서로 다른 받침 음절 비교하기'],
  [13, '소리 듣고 고르기', 10, '비슷한 소리 고르기'],
  [14, '글자 만들기', 1, '음소 합쳐 음절 만들기'],
  [15, '글자 만들기', 2, '음절 합쳐 낱말 만들기'],
  [16, '글자 만들기', 3, '기본 글자 만들기'],
  [17, '글자 만들기', 4, '받침 글자 만들기'],
  [18, '글자 만들기', 5, '겹받침 글자 만들기'],
  [19, '글자 자르기', 1, '받침 빼기'],
  [20, '글자 자르기', 2, '음절 빼기'],
  [21, '글자 대치', 1, '음절 바꾸기'],
  [22, '글 해독', 1, '낱말 읽기'],
  [23, '글 해독', 2, '새 낱말 읽기'],
  [25, '글 해독', 4, '문장 읽기'],
  [26, '글 해독', 5, '짧은 글 읽기'],
  [27, '문장 완성 및 이해', 1, '문장 전체 조립'],
  [28, '문장 완성 및 이해', 2, '빈칸에 알맞은 단어 넣기'],
  [29, '문장 완성 및 이해', 3, '그림과 문장 연결하기'],
  [30, '유창하게 읽기', 1, '문장 따라 읽기'],
  [31, '유창하게 읽기', 2, '단어 이어 읽기'],
  [32, '유창하게 읽기', 3, '끊어 읽기'],
  [33, '유창하게 읽기', 4, '같은 문장 다시 읽기'],
  [34, '유창하게 읽기', 5, '짧은 이야기 읽기'],
] as const

const mockAchievementByTemplateId: Readonly<Record<number, number>> = {
  12: 72,
  13: 61,
  14: 48,
}

export const trainingCatalogFixture: readonly TrainingCatalogItem[] = trainingCatalogMetadata.map(
  ([trainingTemplateId, unitName, sequence, trainingName]) => ({
    trainingTemplateId,
    unitName,
    sequence,
    trainingName,
    studentAchievementRate: mockAchievementByTemplateId[trainingTemplateId] ?? null,
    form: null,
  }),
)

export const currentCurriculumFixture: DailyCurriculum = {
  curriculumId: 201,
  status: 'NOT_STARTED',
  sourceTestCurriculumId: '1011',
  reviewStatus: 'REGENERATION_REQUIRED',
  reviewedByTeacherId: null,
  reviewedAt: null,
  trainings: [
    {
      trainingId: 101,
      trainingTemplateId: 12,
      sequence: 1,
      unitName: '소리 듣고 고르기',
      trainingName: '서로 다른 받침 음절 비교하기',
      status: 'NOT_STARTED',
    },
    {
      trainingId: 102,
      trainingTemplateId: 12,
      sequence: 2,
      unitName: '소리 듣고 고르기',
      trainingName: '서로 다른 받침 음절 비교하기',
      status: 'NOT_READY',
    },
    {
      trainingId: 103,
      trainingTemplateId: 13,
      sequence: 3,
      unitName: '소리 듣고 고르기',
      trainingName: '비슷한 소리 고르기',
      status: 'NOT_STARTED',
    },
  ],
}

export const trainingDetailFixtures: readonly TrainingDetail[] = [
  {
    trainingId: 101,
    trainingTemplateId: 12,
    name: '서로 다른 받침 음절 비교하기',
    form: trainingCatalogFixture[11]?.form ?? null,
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
    name: '서로 다른 받침 음절 비교하기',
    form: trainingCatalogFixture[11]?.form ?? null,
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
    name: '비슷한 소리 고르기',
    form: trainingCatalogFixture[12]?.form ?? null,
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
    name: '서로 다른 받침 음절 비교하기',
    form: trainingCatalogFixture[11]?.form ?? null,
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
    name: '비슷한 소리 고르기',
    form: trainingCatalogFixture[12]?.form ?? null,
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
    name: '음소 합쳐 음절 만들기',
    form: trainingCatalogFixture[13]?.form ?? null,
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
    name: '낱말의 끝소리 고르기',
    form: trainingCatalogFixture[10]?.form ?? null,
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
    name: '낱말의 끝소리 고르기',
    form: trainingCatalogFixture[10]?.form ?? null,
    generatedData: null,
    status: 'COMPLETED',
    startedAt: '2026-05-18T14:00:00+09:00',
    finishedAt: null,
    result: null,
    accuracy: null,
  },
]

const thirtyDayCurriculumLogs: readonly CurriculumLog[] = [
  {
    curriculumId: 190,
    date: '2026-07-20',
    achievement: 88.5,
    trainings: [
      {
        trainingId: 901,
        unitName: '소리 듣고 고르기',
        trainingName: '서로 다른 받침 음절 비교하기',
      },
      { trainingId: 902, unitName: '소리 듣고 고르기', trainingName: '비슷한 소리 고르기' },
      { trainingId: 903, unitName: '글자 만들기', trainingName: '음소 합쳐 음절 만들기' },
    ],
  },
  {
    curriculumId: 189,
    date: '2026-07-05',
    achievement: 0,
    trainings: [
      {
        trainingId: 891,
        unitName: '소리 듣고 고르기',
        trainingName: '낱말의 끝소리 고르기',
      },
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
          {
            trainingId: 801,
            unitName: '소리 듣고 고르기',
            trainingName: '낱말의 끝소리 고르기',
          },
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
        trainingName: '서로 다른 받침 음절 비교하기',
        startedAt: '2026-07-20T09:00:00+09:00',
        finishedAt: '2026-07-20T09:08:30+09:00',
        accuracy: 80,
        questions: trainingDetailFixtures[3]?.result?.questions ?? [],
      },
      {
        trainingId: 902,
        trainingName: '비슷한 소리 고르기',
        startedAt: '2026-07-20T09:10:00+09:00',
        finishedAt: '2026-07-20T09:14:00+09:00',
        accuracy: 100,
        questions: trainingDetailFixtures[4]?.result?.questions ?? [],
      },
      {
        trainingId: 903,
        trainingName: '음소 합쳐 음절 만들기',
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
        trainingName: '낱말의 끝소리 고르기',
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
        trainingName: '낱말의 끝소리 고르기',
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
        trainingName: '서로 다른 받침 음절 비교하기',
        date: '2026-07-20',
        accuracy: 80,
        previousTrainingDate: '2026-07-05',
        previousAccuracy: 70,
      },
      {
        trainingId: 902,
        trainingName: '비슷한 소리 고르기',
        date: '2026-07-20',
        accuracy: 100,
        previousTrainingDate: null,
        previousAccuracy: null,
      },
      {
        trainingId: 903,
        trainingName: '음소 합쳐 음절 만들기',
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
        trainingName: '서로 다른 받침 음절 비교하기',
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
        trainingName: '낱말의 끝소리 고르기',
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
