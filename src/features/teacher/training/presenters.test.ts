import { describe, expect, it } from 'vitest'
import { toTrainingPreview, type TrainingDetail } from '.'

function detail(overrides: Partial<TrainingDetail> = {}): TrainingDetail {
  return {
    trainingId: 1,
    trainingTemplateId: 11,
    name: '받침 읽기',
    form: null,
    generatedData: null,
    status: 'NOT_READY',
    ...overrides,
  }
}

describe('training preview presenter', () => {
  it('generatedData에서 표시 가능한 문항만 읽기 전용 모델로 변환한다', () => {
    const preview = toTrainingPreview(
      detail({
        generatedData: {
          questions: [
            {
              questionId: 'q1',
              problem: { targetText: '꽃을 읽어 보세요.' },
              answer: { correctText: '꽃' },
            },
          ],
        },
      }),
    )

    expect(preview.source).toBe('generated')
    expect(preview.items).toEqual([
      {
        id: 'q1',
        label: '문항 1',
        content: '꽃을 읽어 보세요.',
        answer: '꽃',
      },
    ])
  })

  it('생성 자료가 없으면 알려진 form 필드만 표시하고 raw JSON을 노출하지 않는다', () => {
    const preview = toTrainingPreview(
      detail({
        form: {
          objective: '받침을 정확히 읽습니다.',
          unknownInternalRule: '노출하면 안 되는 내부 규칙',
        },
      }),
    )

    expect(preview.source).toBe('template')
    expect(preview.items.map((item) => item.content)).toEqual([
      '받침을 정확히 읽습니다.',
    ])
    expect(JSON.stringify(preview)).not.toContain('노출하면 안 되는 내부 규칙')
  })

  it('detail이 없으면 임의 자료를 만들지 않는다', () => {
    expect(toTrainingPreview(null)).toMatchObject({
      source: 'empty',
      items: [],
    })
  })
})
