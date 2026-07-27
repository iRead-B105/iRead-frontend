import { describe, expect, it } from 'vitest'
import { normalizeStudentListQuery, serializeStudentListQuery } from './query'

describe('student list query', () => {
  it('빈 keyword를 생략하고 기본 0-based pagination을 사용한다', () => {
    expect(serializeStudentListQuery({ keyword: '   ' })).toBe('page=0&size=10')
  })

  it('검색어를 trim하고 목표 query를 직렬화한다', () => {
    expect(
      serializeStudentListQuery({
        keyword: '  새봄  ',
        age: 8,
        recentDays: 7,
        page: 2,
        size: 20,
      }),
    ).toBe('keyword=%EC%83%88%EB%B4%84&age=8&recentDays=7&page=2&size=20')
  })

  it.each([
    [{ age: 5 }, 'age'],
    [{ age: 13 }, 'age'],
    [{ recentDays: 14 }, 'recentDays'],
    [{ page: -1 }, 'page'],
    [{ size: 0 }, 'size'],
  ])('잘못된 query %o를 차단한다', (query, field) => {
    expect(() => normalizeStudentListQuery(query as never)).toThrow(field)
  })
})
