import type { EditableLessonMaterialItem, LessonMaterialData } from './model'
import type { LessonQuestionType } from './lessonMaterial'
import { hasDisallowedControlCharacter } from '@/lib/inputValidation'

export type LessonMaterialCategory = 'PHONOLOGICAL_AWARENESS' | 'PHONICS' | 'SHORT_TEXT' | 'FLUENCY'

export type LessonMaterialEditorCode =
  | 'E01'
  | 'E02'
  | 'E03'
  | 'E04'
  | 'E05'
  | 'E06'
  | 'E07'
  | 'E08'
  | 'E09'
  | 'E10'
  | 'E11'
  | 'E12'
  | 'E13'

export type LessonMaterialFieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'string-list'
  | 'choice-list'
  | 'json-list'
  | 'select'

export interface LessonMaterialFieldDefinition {
  readonly key: string
  readonly label: string
  readonly kind: LessonMaterialFieldKind
  readonly help?: string
  readonly readonly?: boolean
  readonly maxLength?: number
  readonly maxItems?: number
  readonly max?: number
  /** 읽기 전용 필드의 표시값 변환 (저장 값은 그대로 두고 화면 표기만 바꾼다) */
  readonly format?: (value: unknown) => string
  readonly options?: readonly {
    readonly value: string
    readonly label: string
    readonly disabled?: boolean
  }[]
}

export interface LessonMaterialEditorDefinition {
  readonly questionType: LessonQuestionType
  readonly category: LessonMaterialCategory
  readonly editorCode: LessonMaterialEditorCode
  readonly editorLabel: string
  readonly childAction: string
  readonly contentFields: readonly LessonMaterialFieldDefinition[]
  readonly answerFields: readonly LessonMaterialFieldDefinition[]
}

export interface LessonMaterialValidationIssue {
  readonly path: string
  readonly message: string
}

interface MaterialExample {
  readonly content: LessonMaterialData
  readonly answer: LessonMaterialData
}

const CATEGORY_LABELS: Readonly<Record<LessonMaterialCategory, string>> = {
  PHONOLOGICAL_AWARENESS: '음운 인식 훈련',
  PHONICS: '파닉스 훈련',
  SHORT_TEXT: '짧은 글 훈련',
  FLUENCY: '유창성 훈련',
}

const EDITOR_LABELS: Readonly<Record<LessonMaterialEditorCode, string>> = {
  E01: '시선 따라 보기·말하기',
  E02: '소리 듣고 글자 선택',
  E03: '소리 듣고 일반 선택',
  E04: '유사음 구별',
  E05: '소리 삭제·대치',
  E06: '음소·음절 순서 배열',
  E07: '자모 조합',
  E08: '낱말 묶음 읽기',
  E09: '문장·짧은 글 읽기',
  E10: '따라 읽기·표현 읽기',
  E11: '문장 순서 배열',
  E12: '빈칸 채우기',
  E13: '이미지–문장 선택',
}

const CHILD_ACTIONS: Readonly<Record<LessonMaterialEditorCode, string>> = {
  E01: '획을 시선으로 따라간 뒤 소리 내어 말해요.',
  E02: '소리를 듣고 알맞은 글자 카드를 골라요.',
  E03: '소리나 낱말을 듣고 알맞은 답을 골라요.',
  E04: '비슷한 소리를 듣고 구별해요.',
  E05: '소리 단위를 빼거나 다른 소리로 바꿔요.',
  E06: '소리 카드를 순서대로 놓아 완성해요.',
  E07: '자모 카드를 슬롯에 놓아 글자를 만들어요.',
  E08: '낱말을 순서대로 소리 내어 읽어요.',
  E09: '문장과 짧은 글을 순서대로 읽어요.',
  E10: '모범음을 듣고 표시된 내용을 소리 내어 읽어요.',
  E11: '어절 카드를 순서대로 놓아 문장을 만들어요.',
  E12: '문장의 빈칸에 들어갈 말을 골라요.',
  E13: '장면을 보고 알맞은 문장을 골라요.',
}

const text = (key: string, label: string, help?: string): LessonMaterialFieldDefinition => ({
  key,
  label,
  kind: 'text',
  help,
  maxLength: 200,
})
const textarea = (key: string, label: string, help?: string): LessonMaterialFieldDefinition => ({
  key,
  label,
  kind: 'textarea',
  help,
  maxLength: 2_000,
})
const number = (key: string, label: string, help?: string): LessonMaterialFieldDefinition => ({
  key,
  label,
  kind: 'number',
  help,
  max: 1_000,
})
const stringList = (key: string, label: string, help?: string): LessonMaterialFieldDefinition => ({
  key,
  label,
  kind: 'string-list',
  help,
  maxLength: 200,
  maxItems: 20,
})
const choiceList = (
  key: string,
  label: string,
  help?: string,
  maxItems = 3,
): LessonMaterialFieldDefinition => ({
  key,
  label,
  kind: 'choice-list',
  help,
  maxLength: 200,
  maxItems,
})
const jsonList = (key: string, label: string, help?: string): LessonMaterialFieldDefinition => ({
  key,
  label,
  kind: 'json-list',
  help,
  maxItems: 20,
})
const readonlyText = (
  key: string,
  label: string,
  help?: string,
): LessonMaterialFieldDefinition => ({
  key,
  label,
  kind: 'textarea',
  help,
  readonly: true,
})

const answerIndex = number('answerIndex', '정답 선택지', '첫 번째 선택지는 1로 표시합니다.')
const expectedText = textarea('expectedText', '발음 평가 기준 텍스트')
const result = text('result', '완성 결과')

interface DefinitionInput {
  readonly category: LessonMaterialCategory
  readonly editorCode: LessonMaterialEditorCode
  readonly contentFields: readonly LessonMaterialFieldDefinition[]
  readonly answerFields: readonly LessonMaterialFieldDefinition[]
}

function definition(
  questionType: LessonQuestionType,
  input: DefinitionInput,
): LessonMaterialEditorDefinition {
  return {
    questionType,
    ...input,
    editorLabel: EDITOR_LABELS[input.editorCode],
    childAction: CHILD_ACTIONS[input.editorCode],
  }
}

// 발음 평가 시 백엔드가 자음을 ㅡ 붙인 소리로 바꿔 평가한다(ㅁ→므).
// 교사 화면 표기용으로 같은 규칙을 복제한다.
const CONSONANT_PRONUNCIATION_WITH_EU: Readonly<Record<string, string>> = {
  ㄱ: '그',
  ㄲ: '끄',
  ㄴ: '느',
  ㄷ: '드',
  ㄸ: '뜨',
  ㄹ: '르',
  ㅁ: '므',
  ㅂ: '브',
  ㅃ: '쁘',
  ㅅ: '스',
  ㅆ: '쓰',
  ㅇ: '으',
  ㅈ: '즈',
  ㅉ: '쯔',
  ㅊ: '츠',
  ㅋ: '크',
  ㅌ: '트',
  ㅍ: '프',
  ㅎ: '흐',
}

export function consonantPronunciationWithEu(value: unknown): string {
  if (typeof value !== 'string') return ''
  return CONSONANT_PRONUNCIATION_WITH_EU[value.trim()] ?? value
}

const traceFields = [
  text('target', '화면 표시 글자'),
  text('soundText', 'TTS 안내 문구', '아동에게 들려줄 안내예요. 예: "ㅁ를 따라 써요"'),
  readonlyText('traceAssetKey', '따라쓰기 에셋 키', '획순 에셋은 서버가 관리합니다.'),
] as const
const traceAnswer = [
  {
    ...readonlyText('target', '허용 발음 텍스트', '화면 표시 글자에 맞춰 자동으로 반영됩니다.'),
  },
] as const
const consonantTraceAnswer = [
  {
    ...readonlyText(
      'target',
      '허용 발음 텍스트',
      '자음은 ㅡ를 붙인 소리로 발음을 평가합니다(예: ㅁ→므). 화면 표시 글자에 맞춰 자동으로 반영됩니다.',
    ),
    format: consonantPronunciationWithEu,
  },
] as const
const audioChoiceFields = [
  text('audioText', '들려줄 텍스트'),
  choiceList('choices', '글자 선택지'),
] as const
const consonantSoundChoiceFields = [
  text('audioText', '들려줄 텍스트'),
  choiceList('choices', '글자 선택지', undefined, 3),
] as const
const generalChoiceFields = [
  text('audioText', '목표 소리·낱말'),
  choiceList('choices', '선택지'),
] as const
const orderingFields = [
  stringList('audioParts', '재생할 소리 단위'),
  stringList('cards', '배열 카드'),
] as const
const orderingAnswer = [
  jsonList('answerOrder', '정답 순서', '0부터 시작하는 카드 위치 배열입니다.'),
  result,
] as const
const componentBaseFields = [
  text('targetAudioText', '목표 발음 텍스트'),
  stringList('initialChoices', '초성 선택지'),
  stringList('medialChoices', '중성 선택지'),
] as const
const componentBaseAnswer = [
  number('initialAnswerIndex', '정답 초성'),
  number('medialAnswerIndex', '정답 중성'),
  result,
] as const
const sentenceFields = [
  textarea('sentence', '표시 문장'),
  stringList('tokens', '어절 단위'),
] as const

const DEFINITION_INPUTS: Readonly<Record<LessonQuestionType, DefinitionInput>> = {
  VOWEL_TRACE: {
    category: 'PHONICS',
    editorCode: 'E01',
    contentFields: traceFields,
    answerFields: traceAnswer,
  },
  CONSONANT_TRACE: {
    category: 'PHONICS',
    editorCode: 'E01',
    contentFields: traceFields,
    answerFields: consonantTraceAnswer,
  },
  SYLLABLE_TRACE: {
    category: 'PHONICS',
    editorCode: 'E01',
    contentFields: traceFields,
    answerFields: traceAnswer,
  },
  CONSONANT_SOUND_CHOICE: {
    category: 'PHONICS',
    editorCode: 'E02',
    contentFields: consonantSoundChoiceFields,
    answerFields: [answerIndex],
  },
  VOWEL_SOUND_CHOICE: {
    category: 'PHONICS',
    editorCode: 'E02',
    contentFields: audioChoiceFields,
    answerFields: [answerIndex],
  },
  CONSONANT_VOWEL_CLASSIFICATION: {
    category: 'PHONOLOGICAL_AWARENESS',
    editorCode: 'E03',
    contentFields: generalChoiceFields,
    answerFields: [answerIndex],
  },
  SYLLABLE_INITIAL_CHOICE: {
    category: 'PHONOLOGICAL_AWARENESS',
    editorCode: 'E02',
    contentFields: audioChoiceFields,
    answerFields: [answerIndex],
  },
  WORD_INITIAL_CHOICE: {
    category: 'PHONOLOGICAL_AWARENESS',
    editorCode: 'E02',
    contentFields: audioChoiceFields,
    answerFields: [answerIndex],
  },
  SAME_INITIAL_WORD_CHOICE: {
    category: 'PHONOLOGICAL_AWARENESS',
    editorCode: 'E03',
    contentFields: [
      text('targetAudioText', '목표 낱말'),
      {
        key: 'choiceType',
        label: '선택지 방식',
        kind: 'select',
        options: [
          { value: 'WORD', label: '낱말' },
          {
            value: 'IMAGE_WORD',
            label: '이미지–낱말 후보 (준비 중)',
            disabled: true,
          },
        ],
        help: '이미지–낱말 후보 API 연동 준비 중으로, 새로 선택할 수 없습니다.',
      },
      choiceList(
        'choices',
        '낱말 선택지',
        '이미지–낱말은 이미지 식별자·URL·낱말을 하나의 후보로 유지합니다.',
      ),
    ],
    answerFields: [answerIndex],
  },
  FINAL_CONSONANT_CHOICE: {
    category: 'PHONICS',
    editorCode: 'E03',
    contentFields: generalChoiceFields,
    answerFields: [answerIndex],
  },
  WORD_FINAL_SOUND_CHOICE: {
    category: 'PHONOLOGICAL_AWARENESS',
    editorCode: 'E03',
    contentFields: generalChoiceFields,
    answerFields: [answerIndex],
  },
  FINAL_CONSONANT_COMPARISON: {
    category: 'PHONICS',
    editorCode: 'E03',
    contentFields: generalChoiceFields,
    answerFields: [answerIndex],
  },
  SIMILAR_SOUND_CHOICE: {
    category: 'PHONICS',
    editorCode: 'E04',
    contentFields: [
      text('soundGroup', '비교 소리 그룹'),
      text('audioText', '들려줄 텍스트'),
      choiceList('choices', '비교 선택지'),
    ],
    answerFields: [answerIndex],
  },
  PHONEME_BLEND: {
    category: 'PHONOLOGICAL_AWARENESS',
    editorCode: 'E06',
    contentFields: orderingFields,
    answerFields: orderingAnswer,
  },
  SYLLABLE_BLEND: {
    category: 'PHONOLOGICAL_AWARENESS',
    editorCode: 'E06',
    contentFields: orderingFields,
    answerFields: orderingAnswer,
  },
  BASIC_SYLLABLE_BUILD: {
    category: 'PHONICS',
    editorCode: 'E07',
    contentFields: componentBaseFields,
    answerFields: componentBaseAnswer,
  },
  FINAL_SYLLABLE_BUILD: {
    category: 'PHONICS',
    editorCode: 'E07',
    contentFields: [...componentBaseFields, stringList('finalChoices', '종성 선택지')],
    answerFields: [
      ...componentBaseAnswer.slice(0, 2),
      number('finalAnswerIndex', '정답 종성'),
      result,
    ],
  },
  DOUBLE_FINAL_BUILD: {
    category: 'PHONICS',
    editorCode: 'E07',
    contentFields: [...componentBaseFields, stringList('finalChoices', '겹받침 선택지')],
    answerFields: [
      ...componentBaseAnswer.slice(0, 2),
      number('finalAnswerIndex', '정답 겹받침'),
      result,
    ],
  },
  FINAL_CONSONANT_DELETE: {
    category: 'PHONOLOGICAL_AWARENESS',
    editorCode: 'E05',
    contentFields: [
      text('source', '원본 글자'),
      text('targetAudioText', 'TTS 기준 텍스트'),
      stringList('removableUnits', '삭제 가능한 소리 단위'),
    ],
    answerFields: [answerIndex, result],
  },
  SYLLABLE_DELETE: {
    category: 'PHONOLOGICAL_AWARENESS',
    editorCode: 'E05',
    contentFields: [
      text('source', '원본 낱말'),
      text('targetAudioText', 'TTS 기준 텍스트'),
      stringList('syllables', '음절 단위'),
    ],
    answerFields: [number('deleteIndex', '삭제할 음절'), result],
  },
  SYLLABLE_REPLACE: {
    category: 'PHONOLOGICAL_AWARENESS',
    editorCode: 'E05',
    contentFields: [
      text('source', '원본 낱말'),
      text('targetAudioText', 'TTS 기준 텍스트'),
      number('replaceIndex', '바꿀 음절 위치'),
      choiceList('choices', '대체 선택지'),
    ],
    answerFields: [number('replaceIndex', '정답 대치 위치'), answerIndex, result],
  },
  WORD_READING: {
    category: 'FLUENCY',
    editorCode: 'E08',
    contentFields: [choiceList('words', '읽을 낱말', undefined, 20)],
    answerFields: [expectedText],
  },
  NONWORD_READING: {
    category: 'FLUENCY',
    editorCode: 'E08',
    contentFields: [choiceList('words', '읽을 비단어', undefined, 20)],
    answerFields: [expectedText],
  },
  DIFFICULT_WORD_PREVIEW: {
    category: 'SHORT_TEXT',
    editorCode: 'E10',
    contentFields: [
      jsonList('difficultWords', '어려운 낱말과 음절 분리'),
      textarea('sentence', '표시 문장'),
    ],
    answerFields: [expectedText],
  },
  SENTENCE_READING: {
    category: 'FLUENCY',
    editorCode: 'E09',
    contentFields: sentenceFields,
    answerFields: [expectedText],
  },
  SHORT_PASSAGE_READING: {
    category: 'FLUENCY',
    editorCode: 'E09',
    contentFields: [stringList('sentences', '문장 목록')],
    answerFields: [expectedText],
  },
  SENTENCE_ASSEMBLY: {
    category: 'SHORT_TEXT',
    editorCode: 'E11',
    contentFields: [stringList('cards', '어절 카드')],
    answerFields: [
      jsonList('answerOrder', '정답 순서', '0부터 시작하는 카드 위치 배열입니다.'),
      textarea('completedSentence', '완성 문장'),
    ],
  },
  FILL_IN_THE_BLANK: {
    category: 'SHORT_TEXT',
    editorCode: 'E12',
    contentFields: [
      textarea('sentence', '빈칸 문장', '`{{blank}}` 토큰을 정확히 한 번 포함합니다.'),
      {
        key: 'inputType',
        label: '입력 방식',
        kind: 'select',
        readonly: true,
        help: '1차 구현에서는 선택형만 지원합니다.',
        options: [{ value: 'CHOICE', label: '선택형' }],
      },
      choiceList('choices', '빈칸 선택지'),
    ],
    answerFields: [answerIndex, textarea('completedSentence', '완성 문장')],
  },
  IMAGE_SENTENCE_MATCH: {
    category: 'SHORT_TEXT',
    editorCode: 'E13',
    contentFields: [
      readonlyText('imagePrompt', '이미지 생성 설명', '이미지와 프롬프트는 읽기 전용입니다.'),
      readonlyText('imageUrl', '생성된 이미지 URL', '이미지 URL은 서버가 관리합니다.'),
      choiceList('choices', '문장 선택지'),
    ],
    answerFields: [answerIndex],
  },
  SENTENCE_REPEAT: {
    category: 'FLUENCY',
    editorCode: 'E10',
    contentFields: [
      textarea('sentence', '표시 문장'),
      {
        key: 'emotion',
        label: '감정',
        kind: 'select',
        options: [
          { value: 'HAPPY', label: '기쁨' },
          { value: 'SAD', label: '슬픔' },
          { value: 'CALM', label: '차분함' },
          { value: 'EXCITED', label: '신남' },
        ],
      },
    ],
    answerFields: [expectedText],
  },
  WORD_CHAIN_READING: {
    category: 'FLUENCY',
    editorCode: 'E10',
    contentFields: [
      stringList('words', '낱말 목록'),
      {
        key: 'requiredOrder',
        label: '읽기 순서',
        kind: 'select',
        options: [{ value: 'SEQUENTIAL', label: '표시 순서대로' }],
      },
    ],
    answerFields: [expectedText],
  },
  PHRASE_READING: {
    category: 'FLUENCY',
    editorCode: 'E10',
    contentFields: [textarea('sentence', '표시 문장'), stringList('phrases', '끊어 읽기 단위')],
    answerFields: [expectedText],
  },
  REPEATED_SENTENCE_READING: {
    category: 'FLUENCY',
    editorCode: 'E10',
    contentFields: [textarea('sentence', '표시 문장'), number('repeatCount', '반복 횟수')],
    answerFields: [expectedText],
  },
  SHORT_STORY_READING: {
    category: 'FLUENCY',
    editorCode: 'E10',
    contentFields: [text('title', '이야기 제목'), jsonList('sentences', '화자와 문장 목록')],
    answerFields: [expectedText],
  },
}

export const LESSON_MATERIAL_QUESTION_TYPES = Object.keys(DEFINITION_INPUTS) as LessonQuestionType[]

export const LESSON_MATERIAL_EDITOR_REGISTRY: Readonly<
  Record<LessonQuestionType, LessonMaterialEditorDefinition>
> = Object.fromEntries(
  LESSON_MATERIAL_QUESTION_TYPES.map((questionType) => [
    questionType,
    definition(questionType, DEFINITION_INPUTS[questionType]),
  ]),
) as Record<LessonQuestionType, LessonMaterialEditorDefinition>

export const DEFAULT_LESSON_MATERIAL_DATA: Readonly<Record<LessonQuestionType, MaterialExample>> = {
  VOWEL_TRACE: {
    content: { target: 'ㅏ', soundText: 'ㅏ', traceAssetKey: 'vowel_0' },
    answer: { target: 'ㅏ' },
  },
  CONSONANT_TRACE: {
    content: { target: 'ㄱ', soundText: 'ㄱ', traceAssetKey: 'consonant_0' },
    answer: { target: 'ㄱ' },
  },
  SYLLABLE_TRACE: {
    content: { target: '가', soundText: '가', traceAssetKey: 'syllable_0' },
    answer: { target: '가' },
  },
  CONSONANT_SOUND_CHOICE: {
    content: { audioText: 'ㄱ', choices: ['ㄱ', 'ㄴ', 'ㄷ'] },
    answer: { answerIndex: 0 },
  },
  VOWEL_SOUND_CHOICE: {
    content: { audioText: 'ㅏ', choices: ['ㅏ', 'ㅓ', 'ㅗ'] },
    answer: { answerIndex: 0 },
  },
  CONSONANT_VOWEL_CLASSIFICATION: {
    content: { audioText: 'ㄱ', choices: ['CONSONANT', 'VOWEL'] },
    answer: { answerIndex: 0 },
  },
  SYLLABLE_INITIAL_CHOICE: {
    content: { audioText: '가', choices: ['ㄱ', 'ㄴ', 'ㄷ'] },
    answer: { answerIndex: 0 },
  },
  WORD_INITIAL_CHOICE: {
    content: { audioText: '사과', choices: ['ㅅ', 'ㄱ', 'ㄴ'] },
    answer: { answerIndex: 0 },
  },
  SAME_INITIAL_WORD_CHOICE: {
    content: {
      targetAudioText: '사과',
      choiceType: 'WORD',
      choices: [{ text: '수박' }, { text: '기차' }, { text: '연필' }],
    },
    answer: { answerIndex: 0 },
  },
  FINAL_CONSONANT_CHOICE: {
    content: { audioText: '각', choices: ['ㄱ', 'ㄴ', 'ㄹ'] },
    answer: { answerIndex: 0 },
  },
  WORD_FINAL_SOUND_CHOICE: {
    content: { audioText: '산', choices: ['ㄴ', 'ㄱ', 'ㅁ'] },
    answer: { answerIndex: 0 },
  },
  FINAL_CONSONANT_COMPARISON: {
    content: { audioText: '각', choices: ['각', '간', '갈'] },
    answer: { answerIndex: 0 },
  },
  SIMILAR_SOUND_CHOICE: {
    content: { soundGroup: '평음·격음·경음', audioText: '가', choices: ['가', '카', '까'] },
    answer: { answerIndex: 0 },
  },
  PHONEME_BLEND: {
    content: { audioParts: ['ㄱ', 'ㅏ'], cards: ['ㄱ', 'ㅏ', 'ㄴ'] },
    answer: { answerOrder: [0, 1], result: '가' },
  },
  SYLLABLE_BLEND: {
    content: { audioParts: ['사', '과'], cards: ['사', '과', '나'] },
    answer: { answerOrder: [0, 1], result: '사과' },
  },
  BASIC_SYLLABLE_BUILD: {
    content: {
      targetAudioText: '가',
      initialChoices: ['ㄱ', 'ㄴ'],
      medialChoices: ['ㅏ', 'ㅓ'],
    },
    answer: { initialAnswerIndex: 0, medialAnswerIndex: 0, result: '가' },
  },
  FINAL_SYLLABLE_BUILD: {
    content: {
      targetAudioText: '각',
      initialChoices: ['ㄱ', 'ㄴ'],
      medialChoices: ['ㅏ', 'ㅓ'],
      finalChoices: ['ㄱ', 'ㄴ'],
    },
    answer: {
      initialAnswerIndex: 0,
      medialAnswerIndex: 0,
      finalAnswerIndex: 0,
      result: '각',
    },
  },
  DOUBLE_FINAL_BUILD: {
    content: {
      targetAudioText: '닭',
      initialChoices: ['ㄷ', 'ㄱ'],
      medialChoices: ['ㅏ', 'ㅓ'],
      finalChoices: ['ㄺ', 'ㄱ'],
    },
    answer: {
      initialAnswerIndex: 0,
      medialAnswerIndex: 0,
      finalAnswerIndex: 0,
      result: '닭',
    },
  },
  FINAL_CONSONANT_DELETE: {
    content: { source: '감', targetAudioText: '가', removableUnits: ['ㄱ', 'ㅏ', 'ㅁ'] },
    answer: { answerIndex: 2, result: '가' },
  },
  SYLLABLE_DELETE: {
    content: { source: '사과', targetAudioText: '과', syllables: ['사', '과'] },
    answer: { deleteIndex: 0, result: '과' },
  },
  SYLLABLE_REPLACE: {
    content: {
      source: '사과',
      targetAudioText: '나과',
      replaceIndex: 0,
      choices: ['나', '다'],
    },
    answer: { replaceIndex: 0, answerIndex: 0, result: '나과' },
  },
  WORD_READING: {
    content: { words: ['사과', '나무', '바다'] },
    answer: { expectedText: '사과 나무 바다' },
  },
  NONWORD_READING: {
    content: { words: [{ text: '나무' }, { text: '두미' }] },
    answer: { expectedText: '나무 두미' },
  },
  DIFFICULT_WORD_PREVIEW: {
    content: {
      difficultWords: [{ word: '사과', syllables: ['사', '과'] }],
      sentence: '아기는 사과를 먹는다.',
    },
    answer: { expectedText: '아기는 사과를 먹는다.' },
  },
  SENTENCE_READING: {
    content: { sentence: '아기는 사과를 먹는다.', tokens: ['아기는', '사과를', '먹는다.'] },
    answer: { expectedText: '아기는 사과를 먹는다.' },
  },
  SHORT_PASSAGE_READING: {
    content: { sentences: ['아기는 사과를 먹는다.', '나무 위에서 새가 노래한다.'] },
    answer: { expectedText: '아기는 사과를 먹는다. 나무 위에서 새가 노래한다.' },
  },
  SENTENCE_ASSEMBLY: {
    content: { cards: ['사과를', '먹는다.', '아기는'] },
    answer: { answerOrder: [2, 0, 1], completedSentence: '아기는 사과를 먹는다.' },
  },
  FILL_IN_THE_BLANK: {
    content: {
      sentence: '책상 위에 {{blank}} 그림이 있다.',
      inputType: 'CHOICE',
      choices: ['사과', '기차', '연필'],
    },
    answer: { answerIndex: 0, completedSentence: '책상 위에 사과 그림이 있다.' },
  },
  IMAGE_SENTENCE_MATCH: {
    content: {
      imagePrompt: '아기가 사과를 먹는 장면',
      imageUrl: '',
      choices: ['아기는 사과를 먹는다.', '비가 내린다.'],
    },
    answer: { answerIndex: 0 },
  },
  SENTENCE_REPEAT: {
    content: { sentence: '아기는 사과를 먹는다.', emotion: 'HAPPY' },
    answer: { expectedText: '아기는 사과를 먹는다.' },
  },
  WORD_CHAIN_READING: {
    content: { words: ['사과', '나무', '바다'], requiredOrder: 'SEQUENTIAL' },
    answer: { expectedText: '사과 나무 바다' },
  },
  PHRASE_READING: {
    content: { sentence: '아기는 사과를 먹는다.', phrases: ['아기는', '사과를 먹는다.'] },
    answer: { expectedText: '아기는 사과를 먹는다.' },
  },
  REPEATED_SENTENCE_READING: {
    content: { sentence: '아기는 사과를 먹는다.', repeatCount: 2 },
    answer: { expectedText: '아기는 사과를 먹는다.' },
  },
  SHORT_STORY_READING: {
    content: {
      title: '사과 이야기',
      sentences: [
        { speaker: 'NARRATOR', text: '아기는 사과를 먹는다.' },
        { speaker: 'CHARACTER', text: '정말 맛있어!' },
      ],
    },
    answer: { expectedText: '아기는 사과를 먹는다. 정말 맛있어!' },
  },
}

export function isLessonQuestionType(value: string): value is LessonQuestionType {
  return value in LESSON_MATERIAL_EDITOR_REGISTRY
}

export function getLessonMaterialEditorDefinition(
  questionType: string,
): LessonMaterialEditorDefinition | null {
  return isLessonQuestionType(questionType) ? LESSON_MATERIAL_EDITOR_REGISTRY[questionType] : null
}

export function lessonMaterialCategoryLabel(category: LessonMaterialCategory): string {
  return CATEGORY_LABELS[category]
}

export function defaultLessonMaterialData(questionType: LessonQuestionType): MaterialExample {
  return structuredClone(DEFAULT_LESSON_MATERIAL_DATA[questionType])
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null
}

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function stringValues(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const values = value.map((item) => {
    if (typeof item === 'string') return item
    const candidate = record(item)
    return candidate && typeof candidate.text === 'string' ? candidate.text : null
  })
  return values.every((item): item is string => typeof item === 'string') ? values : null
}

function integer(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function addRequired(
  issues: LessonMaterialValidationIssue[],
  source: Readonly<Record<string, unknown>>,
  path: string,
  key: string,
  label: string,
): void {
  if (!nonBlank(source[key])) {
    issues.push({ path: `${path}.${key}`, message: `${label}을(를) 입력해 주세요.` })
  }
}

// 호환 자모 범위: 자음 U+3131(ㄱ)~U+314E(ㅎ), 모음 U+314F(ㅏ)~U+3163(ㅣ)
const HANGUL_CONSONANT_JAMO = /^[ㄱ-ㅎ]$/
const HANGUL_VOWEL_JAMO = /^[ㅏ-ㅣ]$/
const HANGUL_SYLLABLE = /^[가-힣]$/

function traceTargetIssue(questionType: string, target: string): string | null {
  if (questionType === 'CONSONANT_TRACE' && !HANGUL_CONSONANT_JAMO.test(target)) {
    return HANGUL_VOWEL_JAMO.test(target)
      ? '자음 따라보기에는 모음을 넣을 수 없습니다. 자음(ㄱ~ㅎ) 한 글자를 입력해 주세요.'
      : '자음(ㄱ~ㅎ) 한 글자를 입력해 주세요.'
  }
  if (questionType === 'VOWEL_TRACE' && !HANGUL_VOWEL_JAMO.test(target)) {
    return HANGUL_CONSONANT_JAMO.test(target)
      ? '모음 따라보기에는 자음을 넣을 수 없습니다. 모음(ㅏ~ㅣ) 한 글자를 입력해 주세요.'
      : '모음(ㅏ~ㅣ) 한 글자를 입력해 주세요.'
  }
  if (questionType === 'SYLLABLE_TRACE' && !HANGUL_SYLLABLE.test(target)) {
    return '글자 따라보기에는 완성된 글자(가~힣) 한 글자를 입력해 주세요.'
  }
  return null
}

function validateChoice(
  material: EditableLessonMaterialItem,
  issues: LessonMaterialValidationIssue[],
): void {
  const choices = stringValues(material.content.choices)
  if (!choices || choices.length < 2) {
    issues.push({ path: 'content.choices', message: '선택지를 2개 이상 입력해 주세요.' })
    return
  }
  if (choices.length > 3) {
    issues.push({
      path: 'content.choices',
      message: 'choices는 정답 1개와 오답 2개를 포함해 정확히 3개여야 합니다.',
    })
  }
  if (choices.some((choice) => !choice.trim())) {
    issues.push({ path: 'content.choices', message: '빈 선택지는 사용할 수 없습니다.' })
  }
  const unique = new Set(choices.map((choice) => normalized(choice)))
  if (unique.size !== choices.length) {
    issues.push({ path: 'content.choices', message: '중복 선택지는 사용할 수 없습니다.' })
  }
  const index = material.answer.answerIndex
  if (!integer(index) || index >= choices.length) {
    issues.push({
      path: 'answer.answerIndex',
      message: '정답 선택지가 현재 선택지 범위를 벗어났습니다.',
    })
  }
  if (
    material.questionType === 'SAME_INITIAL_WORD_CHOICE' &&
    material.content.choiceType === 'IMAGE_WORD'
  ) {
    const rawChoices = material.content.choices
    if (
      !Array.isArray(rawChoices) ||
      rawChoices.some((choice) => {
        const candidate = record(choice)
        return (
          !candidate ||
          !integer(candidate.imageId) ||
          !nonBlank(candidate.imageUrl) ||
          !nonBlank(candidate.text)
        )
      })
    ) {
      issues.push({
        path: 'content.choices',
        message: '이미지–낱말 선택지는 이미지 식별자·URL·낱말 후보 묶음으로 선택해 주세요.',
      })
    }
  }
}

function validateIndex(
  value: unknown,
  length: number,
  path: string,
  label: string,
  issues: LessonMaterialValidationIssue[],
): void {
  if (!integer(value) || value >= length) {
    issues.push({ path, message: `${label}이(가) 선택지 범위를 벗어났습니다.` })
  }
}

function expectedSourceText(material: EditableLessonMaterialItem): string | null {
  switch (material.questionType) {
    case 'WORD_READING':
    case 'NONWORD_READING':
    case 'WORD_CHAIN_READING':
      return stringValues(material.content.words)?.join(' ') ?? null
    case 'SENTENCE_READING':
    case 'SENTENCE_REPEAT':
    case 'PHRASE_READING':
    case 'REPEATED_SENTENCE_READING':
    case 'DIFFICULT_WORD_PREVIEW':
      return nonBlank(material.content.sentence) ? material.content.sentence : null
    case 'SHORT_PASSAGE_READING':
      return stringValues(material.content.sentences)?.join(' ') ?? null
    case 'SHORT_STORY_READING': {
      if (!Array.isArray(material.content.sentences)) return null
      const texts = material.content.sentences.map((sentence) => record(sentence)?.text)
      return texts.every(nonBlank) ? texts.join(' ') : null
    }
    default:
      return null
  }
}

export function validateLessonMaterialItem(
  material: EditableLessonMaterialItem,
): readonly LessonMaterialValidationIssue[] {
  const definition = getLessonMaterialEditorDefinition(material.questionType)
  if (!definition) {
    return [{ path: 'questionType', message: '지원하지 않는 문항 유형입니다.' }]
  }

  const issues: LessonMaterialValidationIssue[] = []
  const presentationFields = [
    ['activityName', '활동 이름', 100],
    ['instruction', '지시문', 500],
  ] as const
  for (const [key, label, maxLength] of presentationFields) {
    const value = material.presentation[key]
    if (!value.trim()) {
      issues.push({ path: `presentation.${key}`, message: `${label}을(를) 입력해 주세요.` })
    } else if (value.length > maxLength) {
      issues.push({
        path: `presentation.${key}`,
        message: `${label}은(는) ${maxLength}자 이내로 입력해 주세요.`,
      })
    } else if (hasDisallowedControlCharacter(value, true)) {
      issues.push({
        path: `presentation.${key}`,
        message: `${label}에 허용되지 않는 제어 문자가 포함되어 있습니다.`,
      })
    }
  }
  for (const field of definition.contentFields) {
    if (field.readonly) continue
    const value = material.content[field.key]
    if (field.kind === 'text' || field.kind === 'textarea' || field.kind === 'select') {
      addRequired(issues, material.content, 'content', field.key, field.label)
      if (typeof value === 'string' && field.maxLength && value.length > field.maxLength) {
        issues.push({
          path: `content.${field.key}`,
          message: `${field.label}은(는) ${field.maxLength.toLocaleString('ko-KR')}자 이내로 입력해 주세요.`,
        })
      } else if (typeof value === 'string' && hasDisallowedControlCharacter(value, true)) {
        issues.push({
          path: `content.${field.key}`,
          message: `${field.label}에 허용되지 않는 제어 문자가 포함되어 있습니다.`,
        })
      }
      if (
        field.kind === 'select' &&
        typeof value === 'string' &&
        !field.options?.some((option) => option.value === value)
      ) {
        issues.push({
          path: `content.${field.key}`,
          message: `${field.label}의 허용된 값을 선택해 주세요.`,
        })
      }
    } else if (
      (field.kind === 'string-list' ||
        field.kind === 'choice-list' ||
        field.kind === 'json-list') &&
      (!Array.isArray(value) || value.length === 0)
    ) {
      issues.push({
        path: `content.${field.key}`,
        message: `${field.label}을(를) 한 개 이상 입력해 주세요.`,
      })
    } else if (Array.isArray(value) && field.maxItems && value.length > field.maxItems) {
      const message =
        field.key === 'choices'
          ? 'choices는 정답 1개와 오답 2개를 포함해 정확히 3개여야 합니다.'
          : `${field.label}은(는) ${field.maxItems}개 이하로 입력해 주세요.`
      issues.push({
        path: `content.${field.key}`,
        message,
      })
    } else if (
      (field.kind === 'string-list' || field.kind === 'choice-list') &&
      (stringValues(value) ?? []).some(
        (item) =>
          (field.maxLength !== undefined && item.length > field.maxLength) ||
          hasDisallowedControlCharacter(item, true),
      )
    ) {
      issues.push({
        path: `content.${field.key}`,
        message: `${field.label}의 각 항목을 ${field.maxLength}자 이내의 올바른 텍스트로 입력해 주세요.`,
      })
    } else if (field.kind === 'number' && !integer(value)) {
      issues.push({
        path: `content.${field.key}`,
        message: `${field.label}을(를) 올바르게 입력해 주세요.`,
      })
    } else if (field.kind === 'number' && field.max !== undefined && Number(value) > field.max) {
      issues.push({
        path: `content.${field.key}`,
        message: `${field.label}은(는) ${field.max} 이하로 입력해 주세요.`,
      })
    }
  }
  for (const field of definition.answerFields) {
    if (field.readonly) continue
    const value = material.answer[field.key]
    if (field.kind === 'text' || field.kind === 'textarea' || field.kind === 'select') {
      addRequired(issues, material.answer, 'answer', field.key, field.label)
      if (typeof value === 'string' && field.maxLength && value.length > field.maxLength) {
        issues.push({
          path: `answer.${field.key}`,
          message: `${field.label}은(는) ${field.maxLength.toLocaleString('ko-KR')}자 이내로 입력해 주세요.`,
        })
      } else if (typeof value === 'string' && hasDisallowedControlCharacter(value, true)) {
        issues.push({
          path: `answer.${field.key}`,
          message: `${field.label}에 허용되지 않는 제어 문자가 포함되어 있습니다.`,
        })
      }
      if (
        field.kind === 'select' &&
        typeof value === 'string' &&
        !field.options?.some((option) => option.value === value)
      ) {
        issues.push({
          path: `answer.${field.key}`,
          message: `${field.label}의 허용된 값을 선택해 주세요.`,
        })
      }
    } else if (
      (field.kind === 'string-list' ||
        field.kind === 'choice-list' ||
        field.kind === 'json-list') &&
      (!Array.isArray(value) || value.length === 0)
    ) {
      issues.push({
        path: `answer.${field.key}`,
        message: `${field.label}을(를) 한 개 이상 입력해 주세요.`,
      })
    } else if (Array.isArray(value) && field.maxItems && value.length > field.maxItems) {
      issues.push({
        path: `answer.${field.key}`,
        message: `${field.label}은(는) ${field.maxItems}개 이하로 입력해 주세요.`,
      })
    } else if (
      (field.kind === 'string-list' || field.kind === 'choice-list') &&
      (stringValues(value) ?? []).some(
        (item) =>
          (field.maxLength !== undefined && item.length > field.maxLength) ||
          hasDisallowedControlCharacter(item, true),
      )
    ) {
      issues.push({
        path: `answer.${field.key}`,
        message: `${field.label}의 각 항목을 ${field.maxLength}자 이내의 올바른 텍스트로 입력해 주세요.`,
      })
    } else if (field.kind === 'number' && !integer(value)) {
      issues.push({
        path: `answer.${field.key}`,
        message: `${field.label}을(를) 올바르게 입력해 주세요.`,
      })
    } else if (field.kind === 'number' && field.max !== undefined && Number(value) > field.max) {
      issues.push({
        path: `answer.${field.key}`,
        message: `${field.label}은(는) ${field.max} 이하로 입력해 주세요.`,
      })
    }
  }

  switch (definition.editorCode) {
    case 'E01': {
      // soundText는 TTS 안내 문구라 표시 글자와 달라도 된다(예: "ㅁ를 따라 써요").
      // 자음 따라보기에 모음, 모음 따라보기에 자음이 들어가는 실수를 저장 전에 막는다
      if (nonBlank(material.content.target)) {
        const targetIssue = traceTargetIssue(material.questionType, material.content.target.trim())
        if (targetIssue) {
          issues.push({ path: 'content.target', message: targetIssue })
        }
      }
      break
    }
    case 'E02':
    case 'E03':
    case 'E04':
    case 'E13':
      validateChoice(material, issues)
      break
    case 'E05': {
      const type = material.questionType
      if (type === 'FINAL_CONSONANT_DELETE') {
        const units = stringValues(material.content.removableUnits) ?? []
        validateIndex(
          material.answer.answerIndex,
          units.length,
          'answer.answerIndex',
          '삭제 위치',
          issues,
        )
      } else if (type === 'SYLLABLE_DELETE') {
        const syllables = stringValues(material.content.syllables) ?? []
        validateIndex(
          material.answer.deleteIndex,
          syllables.length,
          'answer.deleteIndex',
          '삭제 위치',
          issues,
        )
        if (
          integer(material.answer.deleteIndex) &&
          nonBlank(material.answer.result) &&
          syllables.filter((_, index) => index !== material.answer.deleteIndex).join('') !==
            material.answer.result
        ) {
          issues.push({
            path: 'answer.result',
            message: '음절을 삭제한 결과와 완성 결과가 일치하지 않습니다.',
          })
        }
      } else {
        const choices = stringValues(material.content.choices) ?? []
        const source = nonBlank(material.content.source) ? [...material.content.source] : []
        validateIndex(
          material.answer.replaceIndex,
          source.length,
          'answer.replaceIndex',
          '대치 위치',
          issues,
        )
        validateIndex(
          material.answer.answerIndex,
          choices.length,
          'answer.answerIndex',
          '대체 선택지',
          issues,
        )
        if (
          integer(material.answer.replaceIndex) &&
          integer(material.answer.answerIndex) &&
          nonBlank(material.answer.result) &&
          source.length > material.answer.replaceIndex &&
          choices.length > material.answer.answerIndex
        ) {
          const replaced = [...source]
          replaced[material.answer.replaceIndex] = choices[material.answer.answerIndex] ?? ''
          if (replaced.join('') !== material.answer.result) {
            issues.push({
              path: 'answer.result',
              message: '대치 위치와 선택지로 만든 결과가 완성 결과와 일치하지 않습니다.',
            })
          }
        }
      }
      break
    }
    case 'E06':
    case 'E11': {
      const cards = stringValues(material.content.cards) ?? []
      const order = material.answer.answerOrder
      if (
        !Array.isArray(order) ||
        order.length === 0 ||
        order.some((index) => !integer(index) || index >= cards.length) ||
        new Set(order).size !== order.length
      ) {
        issues.push({
          path: 'answer.answerOrder',
          message: '정답 순서는 카드 범위 안의 중복 없는 위치로 입력해 주세요.',
        })
      }
      if (definition.editorCode === 'E11' && Array.isArray(order)) {
        const sentence = order.map((index) => cards[Number(index)] ?? '').join(' ')
        if (
          nonBlank(material.answer.completedSentence) &&
          normalized(sentence) !== normalized(material.answer.completedSentence)
        ) {
          issues.push({
            path: 'answer.completedSentence',
            message: '카드 정답 순서와 완성 문장이 일치하지 않습니다.',
          })
        }
      }
      break
    }
    case 'E07': {
      const slots = [
        ['initialChoices', 'initialAnswerIndex', '초성'],
        ['medialChoices', 'medialAnswerIndex', '중성'],
        ...(material.questionType === 'BASIC_SYLLABLE_BUILD'
          ? []
          : [['finalChoices', 'finalAnswerIndex', '종성']]),
      ] as const
      for (const [choicesKey, answerKey, label] of slots) {
        const choices = stringValues(material.content[choicesKey]) ?? []
        validateIndex(
          material.answer[answerKey],
          choices.length,
          `answer.${answerKey}`,
          label,
          issues,
        )
      }
      break
    }
    case 'E08':
    case 'E09':
    case 'E10': {
      const source = expectedSourceText(material)
      const answer = material.answer.expectedText
      if (source && nonBlank(answer) && normalized(source) !== normalized(answer)) {
        issues.push({
          path: 'answer.expectedText',
          message: '화면 표시 내용과 발음 평가 기준 텍스트가 일치하지 않습니다.',
        })
      }
      if (
        material.questionType === 'REPEATED_SENTENCE_READING' &&
        (!integer(material.content.repeatCount) ||
          material.content.repeatCount < 1 ||
          material.content.repeatCount > 5)
      ) {
        issues.push({
          path: 'content.repeatCount',
          message: '반복 횟수는 1~5회로 입력해 주세요.',
        })
      }
      break
    }
    case 'E12': {
      if (material.content.inputType !== 'CHOICE') {
        issues.push({
          path: 'content.inputType',
          message: '1차 구현에서는 선택형 빈칸 채우기만 저장할 수 있습니다.',
        })
      }
      const sentence = nonBlank(material.content.sentence) ? material.content.sentence : ''
      if ((sentence.match(/\{\{blank\}\}/g) ?? []).length !== 1) {
        issues.push({
          path: 'content.sentence',
          message: '빈칸 문장에는 `{{blank}}` 토큰을 정확히 한 번 입력해 주세요.',
        })
      }
      validateChoice(material, issues)
      const choices = stringValues(material.content.choices) ?? []
      if (integer(material.answer.answerIndex) && choices[material.answer.answerIndex]) {
        const completed = sentence.replace('{{blank}}', choices[material.answer.answerIndex] ?? '')
        if (
          nonBlank(material.answer.completedSentence) &&
          normalized(completed) !== normalized(material.answer.completedSentence)
        ) {
          issues.push({
            path: 'answer.completedSentence',
            message: '빈칸 정답을 적용한 문장과 완성 문장이 일치하지 않습니다.',
          })
        }
      }
      break
    }
  }
  return issues
}
