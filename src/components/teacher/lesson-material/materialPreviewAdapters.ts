import {
  getLessonMaterialEditorDefinition,
  type EditableLessonMaterialItem,
  type LessonMaterialEditorCode,
} from '@/features/teacher/training'

export interface MaterialPreviewModel {
  readonly editorCode: LessonMaterialEditorCode
  readonly label: string
  readonly action: string
  readonly primaryText: string
  readonly secondaryText: string | null
  readonly chips: readonly string[]
  readonly choiceTexts: readonly string[]
  readonly imageUrl: string | null
  readonly imageDescription: string | null
  readonly repeatCount: number | null
}

type PreviewAdapter = (material: EditableLessonMaterialItem) => MaterialPreviewModel

function string(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null
}

function texts(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item : string(record(item)?.text)))
    .filter(Boolean)
}

function integers(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => Number.isInteger(item)).map(Number)
    : []
}

function base(
  code: LessonMaterialEditorCode,
  material: EditableLessonMaterialItem,
  values: Omit<MaterialPreviewModel, 'editorCode' | 'label' | 'action'>,
): MaterialPreviewModel {
  const definition = getLessonMaterialEditorDefinition(material.questionType)
  return {
    editorCode: code,
    label: definition?.editorLabel ?? material.questionType,
    action: definition?.childAction ?? material.presentation.instruction,
    ...values,
  }
}

function choicePreview(
  code: 'E02' | 'E03' | 'E04' | 'E13',
  material: EditableLessonMaterialItem,
): MaterialPreviewModel {
  return base(code, material, {
    primaryText:
      string(material.content.audioText) ||
      string(material.content.targetAudioText) ||
      (code === 'E13' ? '장면을 보고 문장을 골라요.' : '소리를 들어 보세요.'),
    secondaryText: null,
    chips: [],
    choiceTexts: texts(material.content.choices),
    imageUrl: code === 'E13' ? string(material.content.imageUrl) || null : null,
    imageDescription: code === 'E13' ? string(material.content.imagePrompt) || null : null,
    repeatCount: null,
  })
}

const adapters: Readonly<Record<LessonMaterialEditorCode, PreviewAdapter>> = {
  E01: (material) =>
    base('E01', material, {
      primaryText: string(material.content.target),
      secondaryText: `소리 · ${string(material.content.soundText)}`,
      chips: ['시선 따라가기', '말하기'],
      choiceTexts: [],
      imageUrl: null,
      imageDescription: null,
      repeatCount: null,
    }),
  E02: (material) => choicePreview('E02', material),
  E03: (material) => choicePreview('E03', material),
  E04: (material) => choicePreview('E04', material),
  E05: (material) =>
    base('E05', material, {
      primaryText: string(material.content.source),
      secondaryText: string(material.answer.result)
        ? `완성 목표 · ${string(material.answer.result)}`
        : null,
      chips:
        texts(material.content.removableUnits).length > 0
          ? texts(material.content.removableUnits)
          : texts(material.content.syllables),
      choiceTexts: texts(material.content.choices),
      imageUrl: null,
      imageDescription: null,
      repeatCount: null,
    }),
  E06: (material) =>
    base('E06', material, {
      primaryText: string(material.answer.result),
      secondaryText: texts(material.content.audioParts).join(' + ') || null,
      chips: [],
      choiceTexts: texts(material.content.cards),
      imageUrl: null,
      imageDescription: null,
      repeatCount: null,
    }),
  E07: (material) =>
    base('E07', material, {
      primaryText: string(material.answer.result),
      secondaryText: string(material.content.targetAudioText) || null,
      chips: [
        ...texts(material.content.initialChoices),
        ...texts(material.content.medialChoices),
        ...texts(material.content.finalChoices),
      ],
      choiceTexts: [],
      imageUrl: null,
      imageDescription: null,
      repeatCount: null,
    }),
  E08: (material) =>
    base('E08', material, {
      primaryText: string(material.answer.expectedText),
      secondaryText: null,
      chips: texts(material.content.words),
      choiceTexts: [],
      imageUrl: null,
      imageDescription: null,
      repeatCount: null,
    }),
  E09: (material) =>
    base('E09', material, {
      primaryText:
        string(material.content.sentence) || texts(material.content.sentences).join(' '),
      secondaryText: string(material.answer.expectedText) || null,
      chips: texts(material.content.tokens),
      choiceTexts: [],
      imageUrl: null,
      imageDescription: null,
      repeatCount: null,
    }),
  E10: (material) => {
    const storySentences = Array.isArray(material.content.sentences)
      ? material.content.sentences
          .map((sentence) => string(record(sentence)?.text))
          .filter(Boolean)
      : []
    return base('E10', material, {
      primaryText:
        string(material.content.sentence) ||
        string(material.content.title) ||
        texts(material.content.words).join(' ') ||
        storySentences.join(' '),
      secondaryText: string(material.answer.expectedText) || null,
      chips:
        texts(material.content.phrases).length > 0
          ? texts(material.content.phrases)
          : texts(material.content.words),
      choiceTexts: [],
      imageUrl: null,
      imageDescription: null,
      repeatCount: Number.isInteger(material.content.repeatCount)
        ? Number(material.content.repeatCount)
        : null,
    })
  },
  E11: (material) => {
    const cards = texts(material.content.cards)
    const ordered = integers(material.answer.answerOrder)
      .map((index) => cards[index])
      .filter((value): value is string => Boolean(value))
    return base('E11', material, {
      primaryText: string(material.answer.completedSentence),
      secondaryText: ordered.join(' ') || null,
      chips: [],
      choiceTexts: cards,
      imageUrl: null,
      imageDescription: null,
      repeatCount: null,
    })
  },
  E12: (material) =>
    base('E12', material, {
      primaryText: string(material.content.sentence).replace('{{blank}}', '______'),
      secondaryText: string(material.answer.completedSentence) || null,
      chips: [],
      choiceTexts: texts(material.content.choices),
      imageUrl: null,
      imageDescription: null,
      repeatCount: null,
    }),
  E13: (material) => choicePreview('E13', material),
}

export function toMaterialPreviewModel(
  material: EditableLessonMaterialItem,
): MaterialPreviewModel | null {
  const definition = getLessonMaterialEditorDefinition(material.questionType)
  return definition ? adapters[definition.editorCode](material) : null
}
