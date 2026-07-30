import type {
  StoryDetailDto,
  StoryGazeAnalysisDto,
  StoryHistoryListDto,
  StoryLineDto,
  StorySceneDto,
  StorySummaryDto,
  StoryTemplateDto,
} from './adapters'

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

export const storyHistoryFixturesByStudent: Readonly<
  Record<number, readonly StorySummaryDto[]>
> = {
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

function createLine(
  lineId: number,
  lineOrder: number,
  lineText: string,
  read: boolean,
  requiresBranchInput = false,
): StoryLineDto {
  const minute = String(lineOrder).padStart(2, '0')
  return {
    lineId,
    lineOrder,
    lineText,
    requiresBranchInput,
    readAt: read
      ? `2026-07-${String(24 + Math.floor(lineOrder / 4)).padStart(2, '0')}T15:${minute}:00+09:00`
      : null,
  }
}

const story6801Scenes: readonly StorySceneDto[] = [
  {
    sceneId: 7101,
    sequenceNo: 1,
    imageUrl: '/images/story-scene-forest.svg',
    imageGenerationStatus: 'AVAILABLE',
    lines: [
      createLine(7201, 1, '별빛이 내려앉은 숲에서 토끼가 길을 찾아요.', true),
      createLine(7202, 2, '반짝이는 나뭇잎이 토끼에게 북쪽을 가리켰어요.', true),
      createLine(7203, 3, '토끼는 작은 발자국을 따라 천천히 걸었어요.', true),
    ],
  },
  {
    sceneId: 7102,
    sequenceNo: 2,
    imageUrl: '/images/story-scene-owl.svg',
    imageGenerationStatus: 'AVAILABLE',
    lines: [
      createLine(7204, 4, '토끼는 누구에게 길을 물어볼지 고민했어요.', true, true),
      createLine(7205, 5, '별을 잘 아는 부엉이가 나무 위에서 인사했어요.', true),
      createLine(7206, 6, '부엉이는 달빛이 비치는 오솔길을 알려 주었어요.', true),
    ],
  },
  {
    sceneId: 7103,
    sequenceNo: 3,
    imageUrl: null,
    imageGenerationStatus: 'PENDING',
    lines: [
      createLine(7207, 7, '오솔길 끝에는 작은 별빛 연못이 있었어요.', true),
      createLine(7208, 8, '토끼는 연못에 비친 집의 방향을 찾았어요.', true),
      createLine(7209, 9, '친구들은 토끼가 돌아오기를 기다리고 있었어요.', true),
    ],
  },
  {
    sceneId: 7104,
    sequenceNo: 4,
    imageUrl: null,
    imageGenerationStatus: 'FAILED',
    lines: [
      createLine(7210, 10, '토끼는 부엉이에게 고맙다고 인사했어요.', false),
      createLine(7211, 11, '숲의 별빛은 집으로 가는 길을 환하게 밝혔어요.', false),
      createLine(7212, 12, '토끼는 다음 밤에도 친구를 만나기로 했어요.', false),
    ],
  },
]

export const storyDetailFixturesById: Readonly<Record<number, StoryDetailDto>> = {
  6801: {
    story: storyHistoryFixturesByStudent[1]![0]!,
    scenes: story6801Scenes,
    branches: [
      {
        choiceId: 7301,
        branchLineId: 7204,
        promptText: '토끼가 먼저 누구에게 도움을 요청하면 좋을까?',
        transcript: '별을 잘 아는 부엉이에게 물어보면 좋겠어요.',
        createdAt: '2026-07-28T16:42:00+09:00',
      },
    ],
  },
  6802: {
    story: storyHistoryFixturesByStudent[1]![1]!,
    scenes: [
      {
        sceneId: 7111,
        sequenceNo: 1,
        imageUrl: null,
        imageGenerationStatus: 'NOT_REQUESTED',
        lines: [
          createLine(7221, 1, '구름 우체국에 아침 편지가 도착했어요.', true),
          createLine(7222, 2, '바람 배달부가 편지를 차곡차곡 나누었어요.', true),
          createLine(7225, 3, '노란 우표가 붙은 편지는 햇살 마을로 향했어요.', true),
          createLine(7226, 4, '배달부는 구름 계단을 조심조심 내려갔어요.', true),
          createLine(7227, 5, '편지를 기다리던 친구가 창문을 활짝 열었어요.', true),
        ],
      },
      {
        sceneId: 7112,
        sequenceNo: 2,
        imageUrl: null,
        imageGenerationStatus: 'NOT_REQUESTED',
        lines: [
          createLine(7223, 6, '가장 먼 구름섬에도 편지가 무사히 전해졌어요.', true),
          createLine(7224, 7, '친구들은 답장을 쓰며 환하게 웃었어요.', true),
          createLine(7228, 8, '친구는 고마운 마음을 답장에 가득 담았어요.', true),
          createLine(7229, 9, '답장은 저녁 바람을 타고 우체국으로 돌아왔어요.', true),
          createLine(7230, 10, '구름 우체국의 하루가 따뜻하게 마무리되었어요.', true),
        ],
      },
    ],
    branches: [],
  },
  6803: {
    story: storyHistoryFixturesByStudent[1]![2]!,
    scenes: [
      {
        sceneId: 7121,
        sequenceNo: 1,
        imageUrl: null,
        imageGenerationStatus: 'NOT_REQUESTED',
        lines: [
          createLine(7241, 1, '바다 마을에 오래된 지도 한 장이 발견되었어요.', false),
          createLine(7242, 2, '친구들은 지도 속 표시를 따라가 보기로 했어요.', false),
          createLine(7243, 3, '파도 너머로 반짝이는 섬이 보이기 시작했어요.', false),
          createLine(7244, 4, '작은 배는 천천히 섬 가까이 다가갔어요.', false),
          createLine(7245, 5, '섬에는 처음 보는 꽃들이 가득 피어 있었어요.', false),
          createLine(7246, 6, '친구들은 새로운 모험을 준비했어요.', false),
        ],
      },
    ],
    branches: [],
  },
  6901: {
    story: storyHistoryFixturesByStudent[2]![0]!,
    scenes: [
      {
        sceneId: 7131,
        sequenceNo: 1,
        imageUrl: null,
        imageGenerationStatus: 'PENDING',
        lines: [
          createLine(7231, 1, '바닷속 도서관에는 물결 모양 책장이 있어요.', true),
          createLine(7232, 2, '문어 사서가 잃어버린 책을 찾고 있었어요.', true),
          createLine(7233, 3, '작은 물고기가 모래 아래에서 책갈피를 발견했어요.', true),
          createLine(7234, 4, '책갈피에는 비밀 서고로 가는 길이 그려져 있었어요.', true),
          createLine(7235, 5, '친구들은 산호 계단을 따라 아래로 내려갔어요.', false),
          createLine(7236, 6, '문이 열리자 오래된 이야기책들이 나타났어요.', false),
          createLine(7237, 7, '잃어버린 책은 가장 높은 선반에 놓여 있었어요.', false),
          createLine(7238, 8, '문어 사서는 책을 찾아 준 친구들에게 감사했어요.', false),
          createLine(7239, 9, '도서관에는 다시 즐거운 이야기 소리가 퍼졌어요.', false),
        ],
      },
    ],
    branches: [],
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
    sentenceMetrics: [
      {
        storyLineId: 7202,
        sequenceNo: 2,
        surfaceText: '반짝이는 나뭇잎이 토끼에게 북쪽을 가리켰어요.',
        dwellDurationMs: 7_400,
        fixationCount: 8,
        firstGazeOffsetMs: 6_500,
        lastGazeOffsetMs: 13_900,
      },
      {
        storyLineId: 7201,
        sequenceNo: 1,
        surfaceText: '별빛이 내려앉은 숲에서 토끼가 길을 찾아요.',
        dwellDurationMs: 6_200,
        fixationCount: 7,
        firstGazeOffsetMs: 120,
        lastGazeOffsetMs: 6_320,
      },
      {
        storyLineId: 7204,
        sequenceNo: 4,
        surfaceText: '토끼는 누구에게 길을 물어볼지 고민했어요.',
        dwellDurationMs: 9_100,
        fixationCount: 11,
        firstGazeOffsetMs: 20_400,
        lastGazeOffsetMs: 29_500,
      },
    ],
    regressions: [
      {
        fromTargetIndex: 2,
        fromTokenIndex: 4,
        toTargetIndex: 2,
        toTokenIndex: 1,
        offsetMs: 4_820,
      },
      {
        fromTargetIndex: 4,
        fromTokenIndex: 3,
        toTargetIndex: 3,
        toTokenIndex: 2,
        offsetMs: 25_300,
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
