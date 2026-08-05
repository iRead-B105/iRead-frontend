import { describe, expect, it } from 'vitest'
import {
  formatTrainingDuration,
  formatTrainingQuestionAnswer,
  formatTrainingQuestionContent,
  toTrainingPreview,
  trainingDetailQuestions,
  trainingStatusLabel,
  type TrainingDetail,
} from '.'

function detail(overrides: Partial<TrainingDetail> = {}): TrainingDetail {
  return {
    trainingId: 1,
    trainingTemplateId: 11,
    name: '받침 읽기',
    form: null,
    generatedData: null,
    status: 'NOT_READY',
    startedAt: null,
    finishedAt: null,
    result: null,
    accuracy: null,
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

  it('백엔드 34개 템플릿의 다양한 문항 필드를 실제 값으로 표시한다', () => {
    const preview = toTrainingPreview(
      detail({
        generatedData: {
          questions: [
            { audioText: 'ㄱ', choices: ['ㄴ', 'ㄱ'], answerIndex: 1 },
            { words: ['사과', '나무', '바다'] },
            {
              cards: ['먹는다.', '아기는', '사과를'],
              answerOrder: [1, 2, 0],
              completedSentence: '아기는 사과를 먹는다.',
            },
            {
              difficultWords: [{ word: '국물', syllables: ['국', '물'] }],
              sentence: '아기는 따뜻한 국물을 먹는다.',
            },
          ],
        },
      }),
    )

    expect(preview.source).toBe('generated')
    expect(preview.items).toEqual([
      expect.objectContaining({ content: 'ㄱ', answer: 'ㄱ' }),
      expect.objectContaining({ content: '사과 · 나무 · 바다' }),
      expect.objectContaining({
        content: '아기는 사과를 먹는다.',
        answer: '아기는 사과를 먹는다.',
      }),
      expect.objectContaining({ content: '아기는 따뜻한 국물을 먹는다.' }),
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
    expect(preview.items.map((item) => item.content)).toEqual(['받침을 정확히 읽습니다.'])
    expect(JSON.stringify(preview)).not.toContain('노출하면 안 되는 내부 규칙')
  })

  it('detail이 없으면 임의 자료를 만들지 않는다', () => {
    expect(toTrainingPreview(null)).toMatchObject({
      source: 'empty',
      items: [],
    })
  })
})

describe('training history presenters', () => {
  it('문항 원본에서 지시문과 보기를 함께 표시한다', () => {
    expect(
      formatTrainingQuestionContent({
        prompt: '순서를 맞추세요.',
        cards: ['나는', '읽어요'],
      }),
    ).toBe('순서를 맞추세요. · 카드: 나는 / 읽어요')
    expect(formatTrainingQuestionContent(null)).toBe('문항 원본 없음')
  })

  it('순서 배열과 글자 조합 답안을 실제 보기 값으로 변환한다', () => {
    expect(
      formatTrainingQuestionAnswer([1, 0], 'ORDERING', {
        prompt: '순서를 맞추세요.',
        cards: ['나는', '읽어요'],
      }),
    ).toBe('읽어요 → 나는')
    expect(
      formatTrainingQuestionAnswer(
        [
          { slot: 'INITIAL', selectedIndex: 1 },
          { slot: 'MEDIAL', selectedIndex: 0 },
        ],
        'COMPONENT_BUILD',
        { initialChoices: ['ㄱ', 'ㄴ'], medialChoices: ['ㅏ', 'ㅓ'] },
      ),
    ).toBe('초성: ㄴ · 중성: ㅏ')
  })

  it('따라 쓰기 좌표는 원시 JSON 대신 응답 완료로 표시한다', () => {
    expect(
      formatTrainingQuestionAnswer({ strokes: [{ points: [{ x: 1, y: 2 }] }] }, 'TRACE', {
        instruction: '따라 쓰세요.',
      }),
    ).toBe('따라 쓰기 응답 완료')
  })

  it('네 가지 상태를 확정된 대문자 enum에서 표시한다', () => {
    expect(trainingStatusLabel('NOT_READY')).toBe('준비 전')
    expect(trainingStatusLabel('NOT_STARTED')).toBe('시작 전')
    expect(trainingStatusLabel('IN_PROGRESS')).toBe('진행 중')
    expect(trainingStatusLabel('COMPLETED')).toBe('완료')
  })

  it('시작·완료 시각이 모두 있을 때만 학습 시간을 계산한다', () => {
    expect(formatTrainingDuration('2026-07-20T09:00:00+09:00', '2026-07-20T09:08:30+09:00')).toBe(
      '8분 30초',
    )
    expect(formatTrainingDuration('2026-07-20T09:00:00+09:00', null)).toBe('-')
  })

  it('서버가 제공한 문항만 표시한다', () => {
    const completed = detail({
      result: {
        questions: [
          {
            questionNumber: 1,
            question: null,
            isCorrect: null,
            selectedAnswer: null,
            correctAnswer: null,
          },
        ],
      },
    })

    expect(trainingDetailQuestions(completed)).toHaveLength(1)
    expect(trainingDetailQuestions(detail({ accuracy: 100 }))).toEqual([])
  })
})
