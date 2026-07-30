import { describe, expect, it } from 'vitest'
import { mapStoryDetail, mapStoryGazeAnalysis } from './adapters'
import {
  storyDetailFixturesById,
  storyGazeFixturesByStoryId,
} from './fixtures'

describe('story detail adapters', () => {
  it('장면·문장·문장별 시선 지표를 표시 순서로 정렬한다', () => {
    const detailFixture = storyDetailFixturesById[6801]!
    const gazeFixture = storyGazeFixturesByStoryId[6801]!
    const detail = mapStoryDetail({
      ...detailFixture,
      scenes: [...detailFixture.scenes].reverse(),
    })
    const gaze = mapStoryGazeAnalysis(gazeFixture)

    expect(detail.scenes.map((scene) => scene.sequenceNo)).toEqual([1, 2, 3, 4])
    expect(detail.scenes[0]?.lines.map((line) => line.lineOrder)).toEqual([1, 2, 3])
    expect(gaze.sentenceMetrics.map((metric) => metric.sequenceNo)).toEqual([1, 2, 4])
    expect(gaze).toMatchObject({
      totalVisitedDurationMs: 38_400,
      totalVisitedCount: 42,
      reverseReadCount: 5,
      avgVisitedDurationMs: 914,
    })
  })

  it('nullable 시선 배열은 빈 배열로 정규화한다', () => {
    const gaze = mapStoryGazeAnalysis({
      ...storyGazeFixturesByStoryId[6801]!,
      sentenceMetrics: null,
      regressions: null,
      analysisMeta: null,
    })

    expect(gaze.sentenceMetrics).toEqual([])
    expect(gaze.regressions).toEqual([])
    expect(gaze.analysisMeta).toBeNull()
  })

  it.each([
    ['AVAILABLE URL 없음', 'AVAILABLE', null],
    ['미요청 URL 존재', 'NOT_REQUESTED', '/scene.png'],
    ['생성 중 URL 존재', 'PENDING', '/scene.png'],
    ['실패 URL 존재', 'FAILED', '/scene.png'],
  ] as const)('%s 조합을 계약 위반으로 처리한다', (_, imageGenerationStatus, imageUrl) => {
    const fixture = storyDetailFixturesById[6801]!
    expect(() =>
      mapStoryDetail({
        ...fixture,
        scenes: [
          {
            ...fixture.scenes[0]!,
            imageGenerationStatus,
            imageUrl,
          },
        ],
      }),
    ).toThrow('이미지 상태와 URL 조합이 올바르지 않습니다')
  })
})
