import type {
  DailyCurriculum,
  ExpectedWord,
  TrainingCatalogItem,
  TrainingDetail,
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
  },
  {
    trainingId: 102,
    trainingTemplateId: 12,
    name: '받침 소리 구분',
    form: trainingCatalogFixture[1]?.form ?? null,
    generatedData: null,
    status: 'NOT_READY',
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
