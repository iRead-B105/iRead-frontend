import { describe, expect, it } from 'vitest'
import { mapStoryDetail, mapStoryGazeAnalysis } from './adapters'
import { storyDetailFixturesById, storyGazeFixturesByStoryId } from '@/test/fixtures/story'

describe('story detail adapters', () => {
  it('이야기 페이지와 페이지별 시선 지표를 페이지 번호순으로 정렬한다', () => {
    const detailFixture = storyDetailFixturesById[6801]!
    const gazeFixture = storyGazeFixturesByStoryId[6801]!
    const detail = mapStoryDetail({
      ...detailFixture,
      pages: [...(detailFixture.pages ?? [])].reverse(),
    })
    const gaze = mapStoryGazeAnalysis(gazeFixture)

    expect(detail.pages.map((page) => page.pageNo)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    )
    expect(detail.pages[0]).toMatchObject({
      storyLineId: 7201,
      backgroundImagePosition: 'center',
      textLines: ['별빛이 내려앉은 숲에서 토끼가 길을 찾아요.'],
    })
    expect(gaze.pageMetrics.map((metric) => metric.pageNo)).toEqual([1, 2, 4])
    expect(gaze).toMatchObject({
      totalVisitedDurationMs: 38_400,
      totalVisitedCount: 42,
      reverseReadCount: 5,
      avgVisitedDurationMs: 914,
    })
  })

  it('객체 또는 JSON 문자열 형태의 본문을 표시 가능한 텍스트로 정규화한다', () => {
    const fixture = storyDetailFixturesById[6801]!
    const page = fixture.pages![0]!

    const detail = mapStoryDetail({
      ...fixture,
      pages: [
        {
          ...page,
          textLines: [
            '{"text":"글자 탐색을 시작한 초기 학습자입니다."}',
            { text: '빛나는 지도를 발견했습니다.' },
          ],
        },
      ],
      totalPages: 1,
    })

    expect(detail.pages[0]?.textLines).toEqual([
      '글자 탐색을 시작한 초기 학습자입니다.',
      '빛나는 지도를 발견했습니다.',
    ])
  })

  it('단어 지표와 판정 이벤트의 0과 null을 구분해 매핑한다', () => {
    const gaze = mapStoryGazeAnalysis({
      ...storyGazeFixturesByStoryId[6801]!,
      pageMetrics: null,
    })
    const metric = mapStoryGazeAnalysis({
      ...storyGazeFixturesByStoryId[6801]!,
      pageMetrics: [
        {
          ...storyGazeFixturesByStoryId[6801]!.pageMetrics![0]!,
          regressions: null,
        },
      ],
    })

    expect(gaze.pageMetrics).toEqual([])
    expect(metric.pageMetrics[0]?.regressions).toEqual([])
    expect(gaze.wordMetrics[0]).toMatchObject({ dwellDurationMs: 1200, firstSeenMs: 0 })
    expect(gaze.wordMetrics[1]).toMatchObject({ dwellDurationMs: 0, firstSeenMs: null })
    expect(gaze.replay?.events.map((event) => event.movementType)).toEqual([
      'READ',
      'SKIP',
      'REGRESSION',
    ])
    expect(gaze.replay?.events[1]?.skippedTokenIndexes).toEqual([1])
    expect(gaze.analysisMeta.calculationVersion).toBe('story-gaze-word-v1')
  })

  it('필수 단어 지표나 판정 버전이 없으면 계약 위반으로 처리한다', () => {
    const fixture = storyGazeFixturesByStoryId[6801]!
    expect(() => mapStoryGazeAnalysis({ ...fixture, wordMetrics: undefined as never }))
      .toThrow('wordMetrics 배열이 필요합니다')
    expect(() => mapStoryGazeAnalysis({
      ...fixture,
      analysisMeta: {
        ...fixture.analysisMeta,
        calculationVersion: 'frontend-gaze-v0',
      },
    })).toThrow('지원하지 않는 단어 판정 계약입니다')
  })

  it.each([
    ['AVAILABLE URL 없음', 'AVAILABLE', null],
    ['미요청 URL 존재', 'NOT_REQUESTED', '/scene.png'],
    ['생성 중 URL 존재', 'PENDING', '/scene.png'],
    ['실패 URL 존재', 'FAILED', '/scene.png'],
  ] as const)(
    '%s 조합을 계약 위반으로 처리한다',
    (_, imageGenerationStatus, backgroundImageUrl) => {
      const fixture = storyDetailFixturesById[6801]!
      expect(() =>
        mapStoryDetail({
          ...fixture,
          pages: [
            {
              ...fixture.pages![0]!,
              imageGenerationStatus,
              backgroundImageUrl,
            },
          ],
          totalPages: 1,
        }),
      ).toThrow('이미지 상태와 URL 조합이 올바르지 않습니다')
    },
  )

  it('전체 페이지 수와 연속 페이지 번호가 맞지 않으면 계약 위반으로 처리한다', () => {
    const fixture = storyDetailFixturesById[6801]!

    expect(() => mapStoryDetail({ ...fixture, totalPages: 99 })).toThrow(
      '전체 페이지 수가 페이지 목록과 일치하지 않습니다',
    )
    expect(() =>
      mapStoryDetail({
        ...fixture,
        pages: [{ ...fixture.pages![0]!, pageNo: 2 }],
        totalPages: 1,
      }),
    ).toThrow('페이지 번호가 1부터 연속적이지 않습니다')
  })
})
