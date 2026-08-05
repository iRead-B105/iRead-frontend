import { describe, expect, it } from 'vitest'
import { normalizeStoryHistoryQuery, serializeStoryHistoryQuery } from './query'

describe('story history query', () => {
  it('기본 페이지와 크기를 적용하고 필터를 query string으로 변환한다', () => {
    expect(
      normalizeStoryHistoryQuery({
        from: '2026-07-01',
        to: '2026-07-30',
        storyTemplateId: 1101,
      }),
    ).toEqual({
      from: '2026-07-01',
      to: '2026-07-30',
      storyTemplateId: 1101,
      page: 0,
      size: 20,
    })
    expect(
      serializeStoryHistoryQuery({
        from: '2026-07-01',
        to: '2026-07-30',
        storyTemplateId: 1101,
        page: 2,
        size: 20,
      }),
    ).toBe('from=2026-07-01&to=2026-07-30&storyTemplateId=1101&page=2&size=20')
  })

  it.each([
    [{ page: -1 }, 'page'],
    [{ size: 0 }, 'size'],
    [{ size: 101 }, 'size'],
    [{ storyTemplateId: 0 }, 'storyTemplateId'],
    [{ from: '2026/07/01' }, 'from'],
    [{ from: '2026-02-30' }, '실제 존재하는 날짜'],
    [{ to: 'invalid' }, 'to'],
    [{ from: '2026-07-30', to: '2026-07-01' }, '시작일'],
  ])('잘못된 조회 조건을 요청 전에 거부한다: %o', (query, message) => {
    expect(() => normalizeStoryHistoryQuery(query)).toThrow(message)
  })
})
