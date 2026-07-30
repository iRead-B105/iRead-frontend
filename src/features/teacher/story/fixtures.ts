import type {
  StoryHistoryListDto,
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
