import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LESSON_MATERIAL_DATA,
  LESSON_MATERIAL_EDITOR_REGISTRY,
  LESSON_MATERIAL_QUESTION_TYPES,
  defaultLessonMaterialData,
  getLessonMaterialEditorDefinition,
  validateLessonMaterialItem,
} from './lessonMaterialEditor'
import type { EditableLessonMaterialItem } from './model'

function material(
  questionType: (typeof LESSON_MATERIAL_QUESTION_TYPES)[number],
): EditableLessonMaterialItem {
  const data = defaultLessonMaterialData(questionType)
  return {
    questionNo: 1,
    questionType,
    presentation: {
      activityName: '활동',
      instruction: '안내',
      hint: '',
      correctFeedback: '잘했어요.',
      retryFeedback: '다시 해봐요.',
    },
    content: data.content,
    answer: data.answer,
  }
}

describe('lesson material editor registry', () => {
  it('34개 questionType을 누락·중복 없이 E01~E13 편집기에 연결한다', () => {
    expect(LESSON_MATERIAL_QUESTION_TYPES).toHaveLength(34)
    expect(new Set(LESSON_MATERIAL_QUESTION_TYPES).size).toBe(34)
    expect(Object.keys(LESSON_MATERIAL_EDITOR_REGISTRY)).toHaveLength(34)
    expect(
      new Set(
        LESSON_MATERIAL_QUESTION_TYPES.map(
          (questionType) => LESSON_MATERIAL_EDITOR_REGISTRY[questionType].editorCode,
        ),
      ),
    ).toEqual(
      new Set([
        'E01',
        'E02',
        'E03',
        'E04',
        'E05',
        'E06',
        'E07',
        'E08',
        'E09',
        'E10',
        'E11',
        'E12',
        'E13',
      ]),
    )
  })

  it('4개 학습 카테고리에 10·11·4·9개로 이중 분류한다', () => {
    const counts = Object.values(LESSON_MATERIAL_EDITOR_REGISTRY).reduce<
      Record<string, number>
    >((result, definition) => {
      result[definition.category] = (result[definition.category] ?? 0) + 1
      return result
    }, {})

    expect(counts).toEqual({
      PHONICS: 11,
      PHONOLOGICAL_AWARENESS: 10,
      FLUENCY: 9,
      SHORT_TEXT: 4,
    })
  })

  it('E11·E12·E13을 일반 화면이 아닌 전용 편집기에 연결한다', () => {
    expect(getLessonMaterialEditorDefinition('SENTENCE_ASSEMBLY')?.editorCode).toBe('E11')
    expect(getLessonMaterialEditorDefinition('FILL_IN_THE_BLANK')?.editorCode).toBe('E12')
    expect(getLessonMaterialEditorDefinition('IMAGE_SENTENCE_MATCH')?.editorCode).toBe('E13')
  })

  it.each(LESSON_MATERIAL_QUESTION_TYPES)(
    '%s 기본 Fixture가 유형별 저장 전 검증을 통과한다',
    (questionType) => {
      expect(validateLessonMaterialItem(material(questionType))).toEqual([])
    },
  )

  it('기본 Fixture를 수정해도 registry 원본은 바뀌지 않는다', () => {
    const first = defaultLessonMaterialData('CONSONANT_SOUND_CHOICE')
    ;(first.content.choices as string[])[0] = '변경'

    expect(DEFAULT_LESSON_MATERIAL_DATA.CONSONANT_SOUND_CHOICE.content.choices).toEqual([
      'ㄱ',
      'ㄴ',
      'ㄷ',
    ])
  })
})

describe('lesson material type validation', () => {
  it('선택지 삭제 후 범위를 벗어난 정답과 중복 선택지를 찾는다', () => {
    const current = material('CONSONANT_SOUND_CHOICE')
    const invalid = {
      ...current,
      content: { ...current.content, choices: ['ㄱ', 'ㄱ'] },
      answer: { answerIndex: 2 },
    }

    expect(validateLessonMaterialItem(invalid).map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['content.choices', 'answer.answerIndex']),
    )
  })

  it('문장 카드 순서와 완성 문장의 불일치를 찾는다', () => {
    const current = material('SENTENCE_ASSEMBLY')
    const invalid = {
      ...current,
      answer: { answerOrder: [0, 0, 1], completedSentence: '전혀 다른 문장' },
    }

    expect(validateLessonMaterialItem(invalid).map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['answer.answerOrder', 'answer.completedSentence']),
    )
  })

  it('빈칸은 CHOICE와 단일 blank 토큰만 허용한다', () => {
    const current = material('FILL_IN_THE_BLANK')
    const invalid = {
      ...current,
      content: {
        ...current.content,
        sentence: '{{blank}} 그리고 {{blank}}',
        inputType: 'VOICE',
      },
    }

    expect(validateLessonMaterialItem(invalid).map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['content.inputType', 'content.sentence']),
    )
  })

  it('표시 문장과 발음 평가 기준 텍스트의 불일치를 찾는다', () => {
    const current = material('SENTENCE_READING')
    const invalid = {
      ...current,
      answer: { expectedText: '다른 문장' },
    }

    expect(validateLessonMaterialItem(invalid)).toContainEqual({
      path: 'answer.expectedText',
      message: '화면 표시 내용과 발음 평가 기준 텍스트가 일치하지 않습니다.',
    })
  })

  it('IMAGE_WORD 선택지는 이미지 식별자·URL·낱말 묶음을 유지한다', () => {
    const current = material('SAME_INITIAL_WORD_CHOICE')
    const invalid = {
      ...current,
      content: {
        ...current.content,
        choiceType: 'IMAGE_WORD',
        choices: [{ text: '수박' }, { imageId: 2, imageUrl: '/watermelon.png', text: '수박' }],
      },
    }

    expect(validateLessonMaterialItem(invalid)).toContainEqual({
      path: 'content.choices',
      message: '이미지–낱말 선택지는 이미지 식별자·URL·낱말 후보 묶음으로 선택해 주세요.',
    })
  })
})
