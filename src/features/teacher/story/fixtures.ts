import type {
  StoryBranchRecordDto,
  StoryDetailDto,
  StoryGazeAnalysisDto,
  StoryHistoryListDto,
  StoryPageDto,
  StorySummaryDto,
  StoryTemplateDto,
} from './adapters'
import type { StoryImageGenerationStatus } from './model'

export const storyTemplateFixtures: readonly StoryTemplateDto[] = [
  {
    storyTemplateId: 1101,
    storyTemplateTitle: '별빛 숲의 친구',
    storyTemplateImageUrl: null,
  },
  {
    storyTemplateId: 1102,
    storyTemplateTitle: '구름 위의 우체국',
    storyTemplateImageUrl: null,
  },
  {
    storyTemplateId: 1103,
    storyTemplateTitle: '바닷속 도서관',
    storyTemplateImageUrl: null,
  },
]

export const storyHistoryFixturesByStudent: Readonly<Record<number, readonly StorySummaryDto[]>> = {
  1: [
    {
      storyId: 6801,
      storyTemplateId: 1101,
      storyTemplateTitle: '별빛 숲의 친구',
      storyTemplateImageUrl: null,
      storyStatus: 'COMPLETED',
      generationProgress: 100,
      createdAt: '2026-07-24T15:00:00+09:00',
      lastReadAt: '2026-07-30T16:42:00+09:00',
      readingCompletedAt: null,
      activityAt: '2026-07-30T16:42:00+09:00',
      readLineCount: 9,
      totalLineCount: 12,
      readingProgress: 75,
      readingStatus: 'IN_PROGRESS',
      gazeAnalysisStatus: 'AVAILABLE',
    },
    {
      storyId: 6802,
      storyTemplateId: 1102,
      storyTemplateTitle: '구름 위의 우체국',
      storyTemplateImageUrl: null,
      storyStatus: 'COMPLETED',
      generationProgress: 100,
      createdAt: '2026-07-20T10:00:00+09:00',
      lastReadAt: '2026-07-21T11:20:00+09:00',
      readingCompletedAt: '2026-07-21T11:20:00+09:00',
      activityAt: '2026-07-21T11:20:00+09:00',
      readLineCount: 10,
      totalLineCount: 10,
      readingProgress: 100,
      readingStatus: 'COMPLETED',
      gazeAnalysisStatus: 'FAILED',
    },
    {
      storyId: 6803,
      storyTemplateId: 1103,
      storyTemplateTitle: '바닷속 도서관',
      storyTemplateImageUrl: null,
      storyStatus: 'IN_PROGRESS',
      generationProgress: 45,
      createdAt: '2026-07-18T09:30:00+09:00',
      lastReadAt: null,
      readingCompletedAt: null,
      activityAt: '2026-07-18T09:30:00+09:00',
      readLineCount: 0,
      totalLineCount: 6,
      readingProgress: 0,
      readingStatus: 'NOT_STARTED',
      gazeAnalysisStatus: 'NOT_COLLECTED',
    },
  ],
  2: [
    {
      storyId: 6901,
      storyTemplateId: 1103,
      storyTemplateTitle: '바닷속 도서관',
      storyTemplateImageUrl: null,
      storyStatus: 'COMPLETED',
      generationProgress: 100,
      createdAt: '2026-07-23T14:00:00+09:00',
      lastReadAt: '2026-07-29T13:10:00+09:00',
      readingCompletedAt: null,
      activityAt: '2026-07-29T13:10:00+09:00',
      readLineCount: 4,
      totalLineCount: 9,
      readingProgress: 44,
      readingStatus: 'IN_PROGRESS',
      gazeAnalysisStatus: 'RUNNING',
    },
  ],
  3: [],
}

interface CreatePageOptions {
  readonly lineId: number
  readonly pageNo: number
  readonly sceneId: number
  readonly sceneOrder: number
  readonly lineOrder: number
  readonly text: string
  readonly read: boolean
  readonly imageUrl?: string | null
  readonly imageStatus?: StoryImageGenerationStatus
  readonly imagePosition?: string | null
  readonly branchRecord?: StoryBranchRecordDto | null
}

function createPage({
  lineId,
  pageNo,
  sceneId,
  sceneOrder,
  lineOrder,
  text,
  read,
  imageUrl = null,
  imageStatus = 'NOT_REQUESTED',
  imagePosition = 'center',
  branchRecord = null,
}: CreatePageOptions): StoryPageDto {
  const minute = String(pageNo).padStart(2, '0')
  return {
    pageNo,
    storyLineId: lineId,
    sceneId,
    sceneOrder,
    lineOrder,
    backgroundImageUrl: imageUrl,
    backgroundImagePosition: imagePosition,
    imageGenerationStatus: imageStatus,
    textLines: [text],
    requiresBranchInput: branchRecord !== null,
    readAt: read
      ? `2026-07-${String(24 + Math.floor(pageNo / 4)).padStart(2, '0')}T15:${minute}:00+09:00`
      : null,
    branchRecord,
  }
}

function createStoryPages(
  texts: readonly string[],
  options: {
    readonly firstLineId: number
    readonly firstSceneId: number
    readonly readCount: number
    readonly imageStatus: StoryImageGenerationStatus
  },
): readonly StoryPageDto[] {
  return texts.map((text, index) =>
    createPage({
      lineId: options.firstLineId + index,
      pageNo: index + 1,
      sceneId: options.firstSceneId + Math.floor(index / 3),
      sceneOrder: Math.floor(index / 3) + 1,
      lineOrder: (index % 3) + 1,
      text,
      read: index < options.readCount,
      imageStatus: options.imageStatus,
    }),
  )
}

const story6801Texts = [
  '별빛이 내려앉은 숲에서 토끼가 길을 찾아요.',
  '반짝이는 나뭇잎이 토끼에게 북쪽을 가리켰어요.',
  '토끼는 작은 발자국을 따라 천천히 걸었어요.',
  '토끼는 누구에게 길을 물어볼지 고민했어요.',
  '별을 잘 아는 부엉이가 나무 위에서 인사했어요.',
  '부엉이는 달빛이 비치는 오솔길을 알려 주었어요.',
  '오솔길 끝에는 작은 별빛 연못이 있었어요.',
  '토끼는 연못에 비친 집의 방향을 찾았어요.',
  '친구들은 토끼가 돌아오기를 기다리고 있었어요.',
  '토끼는 부엉이에게 고맙다고 인사했어요.',
  '숲의 별빛은 집으로 가는 길을 환하게 밝혔어요.',
  '토끼는 다음 밤에도 친구를 만나기로 했어요.',
] as const

const story6801Pages: readonly StoryPageDto[] = story6801Texts.map((text, index) => {
  const pageNo = index + 1
  const sceneOrder = Math.floor(index / 3) + 1
  const imageStatus: StoryImageGenerationStatus =
    sceneOrder <= 2 ? 'AVAILABLE' : sceneOrder === 3 ? 'PENDING' : 'FAILED'
  const imageUrl =
    sceneOrder === 1
      ? '/images/story-scene-forest.svg'
      : sceneOrder === 2
        ? '/images/story-scene-owl.svg'
        : null
  const branchRecord: StoryBranchRecordDto | null =
    pageNo === 4
      ? {
          choiceId: 7301,
          promptText: '토끼가 먼저 누구에게 도움을 요청하면 좋을까?',
          transcript: '별을 잘 아는 부엉이에게 물어보면 좋겠어요.',
          createdAt: '2026-07-28T16:42:00+09:00',
        }
      : null

  return createPage({
    lineId: 7201 + index,
    pageNo,
    sceneId: 7100 + sceneOrder,
    sceneOrder,
    lineOrder: (index % 3) + 1,
    text,
    read: pageNo <= 9,
    imageUrl,
    imageStatus,
    imagePosition: sceneOrder === 2 ? 'center 35%' : 'center',
    branchRecord,
  })
})

export const storyDetailFixturesById: Readonly<Record<number, StoryDetailDto>> = {
  6801: {
    story: storyHistoryFixturesByStudent[1]![0]!,
    pages: story6801Pages,
    totalPages: story6801Pages.length,
  },
  6802: {
    story: storyHistoryFixturesByStudent[1]![1]!,
    pages: createStoryPages(
      [
        '구름 우체국에 아침 편지가 도착했어요.',
        '바람 배달부가 편지를 차곡차곡 나누었어요.',
        '노란 우표가 붙은 편지는 햇살 마을로 향했어요.',
        '배달부는 구름 계단을 조심조심 내려갔어요.',
        '편지를 기다리던 친구가 창문을 활짝 열었어요.',
        '가장 먼 구름섬에도 편지가 무사히 전해졌어요.',
        '친구들은 답장을 쓰며 환하게 웃었어요.',
        '친구는 고마운 마음을 답장에 가득 담았어요.',
        '답장은 저녁 바람을 타고 우체국으로 돌아왔어요.',
        '구름 우체국의 하루가 따뜻하게 마무리되었어요.',
      ],
      {
        firstLineId: 7221,
        firstSceneId: 7111,
        readCount: 10,
        imageStatus: 'NOT_REQUESTED',
      },
    ),
    totalPages: 10,
  },
  6803: {
    story: storyHistoryFixturesByStudent[1]![2]!,
    pages: createStoryPages(
      [
        '바다 마을에 오래된 지도 한 장이 발견되었어요.',
        '친구들은 지도 속 표시를 따라가 보기로 했어요.',
        '파도 너머로 반짝이는 섬이 보이기 시작했어요.',
        '작은 배는 천천히 섬 가까이 다가갔어요.',
        '섬에는 처음 보는 꽃들이 가득 피어 있었어요.',
        '친구들은 새로운 모험을 준비했어요.',
      ],
      {
        firstLineId: 7241,
        firstSceneId: 7121,
        readCount: 0,
        imageStatus: 'NOT_REQUESTED',
      },
    ),
    totalPages: 6,
  },
  6901: {
    story: storyHistoryFixturesByStudent[2]![0]!,
    pages: createStoryPages(
      [
        '바닷속 도서관에는 물결 모양 책장이 있어요.',
        '문어 사서가 잃어버린 책을 찾고 있었어요.',
        '작은 물고기가 모래 아래에서 책갈피를 발견했어요.',
        '책갈피에는 비밀 서고로 가는 길이 그려져 있었어요.',
        '친구들은 산호 계단을 따라 아래로 내려갔어요.',
        '문이 열리자 오래된 이야기책들이 나타났어요.',
        '잃어버린 책은 가장 높은 선반에 놓여 있었어요.',
        '문어 사서는 책을 찾아 준 친구들에게 감사했어요.',
        '도서관에는 다시 즐거운 이야기 소리가 퍼졌어요.',
      ],
      {
        firstLineId: 7231,
        firstSceneId: 7131,
        readCount: 4,
        imageStatus: 'PENDING',
      },
    ),
    totalPages: 9,
  },
}

export const storyGazeFixturesByStoryId: Readonly<Record<number, StoryGazeAnalysisDto>> = {
  6801: {
    gazeSessionId: 7401,
    gazeAnalysisId: 7501,
    calibrationStatus: 'SUCCESS',
    startedAt: '2026-07-30T16:40:00+09:00',
    endedAt: '2026-07-30T16:42:00+09:00',
    totalDwellTime: 38_400,
    dwellCount: 42,
    regressionCount: 5,
    averageFixationTime: 914,
    pageMetrics: [
      {
        storyLineId: 7202,
        pageNo: 2,
        surfaceText: story6801Texts[1],
        dwellDurationMs: 7_400,
        fixationCount: 8,
        regressionCount: 0,
        averageFixationTimeMs: 925,
        firstGazeOffsetMs: 6_500,
        lastGazeOffsetMs: 13_900,
        regressions: [],
      },
      {
        storyLineId: 7201,
        pageNo: 1,
        surfaceText: story6801Texts[0],
        dwellDurationMs: 6_200,
        fixationCount: 7,
        regressionCount: 1,
        averageFixationTimeMs: 886,
        firstGazeOffsetMs: 120,
        lastGazeOffsetMs: 6_320,
        regressions: [
          {
            fromTokenIndex: 4,
            toTokenIndex: 1,
            offsetMs: 4_820,
          },
        ],
      },
      {
        storyLineId: 7204,
        pageNo: 4,
        surfaceText: story6801Texts[3],
        dwellDurationMs: 9_100,
        fixationCount: 11,
        regressionCount: 1,
        averageFixationTimeMs: 827,
        firstGazeOffsetMs: 20_400,
        lastGazeOffsetMs: 29_500,
        regressions: [
          {
            fromTokenIndex: 3,
            toTokenIndex: 2,
            offsetMs: 25_300,
          },
        ],
      },
    ],
    analysisMeta: {
      contentType: 'STORY',
      storyId: 6801,
      calculationSource: 'EYETRACKER',
      gazeSessionDurationMs: 120_000,
    },
  },
}

export function createStoryHistoryListDto(
  storyHistory: readonly StorySummaryDto[],
  page: number,
  size: number,
): StoryHistoryListDto {
  return {
    storyTemplates: storyTemplateFixtures,
    storyHistory,
    page,
    size,
    totalElements: storyHistory.length,
    totalPages: storyHistory.length === 0 ? 0 : Math.ceil(storyHistory.length / size),
  }
}
