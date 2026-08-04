import type {
  TrainingDetail,
  TrainingHistoryQuestionResult,
  TrainingPreview,
  TrainingPreviewItem,
  TrainingQuestionResult,
  TrainingQuestionValue,
  TrainingStatus,
} from './model'

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstString(record: Readonly<Record<string, unknown>>, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function displayValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const values = value.map(displayValue).filter((item): item is string => item !== null)
    return values.length > 0 ? values.join(' · ') : null
  }
  if (!isRecord(value)) return null
  return firstString(value, [
    'text',
    'word',
    'sentence',
    'target',
    'targetText',
    'audioText',
    'result',
    'title',
  ])
}

function firstDisplayValue(
  record: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = displayValue(record[key])
    if (value) return value
  }
  return null
}

function indexedAnswer(question: Readonly<Record<string, unknown>>): string | null {
  const answerIndex = question.answerIndex
  const choices = question.choices
  if (
    typeof answerIndex === 'number' &&
    Number.isInteger(answerIndex) &&
    Array.isArray(choices) &&
    answerIndex >= 0 &&
    answerIndex < choices.length
  ) {
    return displayValue(choices[answerIndex])
  }
  return null
}

function orderedAnswer(question: Readonly<Record<string, unknown>>): string | null {
  const answerOrder = question.answerOrder
  const cards = question.cards
  if (!Array.isArray(answerOrder) || !Array.isArray(cards)) return null
  const values = answerOrder.flatMap((value) => {
    if (typeof value !== 'number' || !Number.isInteger(value)) return []
    const item = displayValue(cards[value])
    return item ? [item] : []
  })
  return values.length > 0 ? values.join(' ') : null
}

function generatedItems(detail: TrainingDetail): readonly TrainingPreviewItem[] {
  const questions = detail.generatedData?.questions
  if (!Array.isArray(questions)) return []

  return questions.flatMap((question, index) => {
    if (!isRecord(question)) return []
    const problem = isRecord(question.problem) ? question.problem : question
    const answer = isRecord(question.answer) ? question.answer : {}
    const content = firstDisplayValue(problem, [
      'targetText',
      'question',
      'prompt',
      'text',
      'sentence',
      'word',
      'target',
      'audioText',
      'targetAudioText',
      'source',
      'completedSentence',
      'result',
      'title',
      'imagePrompt',
      'words',
      'sentences',
      'phrases',
      'cards',
      'choices',
      'syllables',
      'audioParts',
      'difficultWords',
    ])
    if (!content) return []
    const directAnswer =
      firstDisplayValue(answer, ['correctText', 'correctAnswer', 'answer', 'text']) ??
      indexedAnswer(problem) ??
      orderedAnswer(problem) ??
      firstDisplayValue(problem, ['acceptedAnswers', 'completedSentence', 'result', 'target'])
    return [
      {
        id: String(question.questionId ?? question.id ?? index + 1),
        label: `문항 ${index + 1}`,
        content,
        answer: directAnswer,
      },
    ]
  })
}

function templateItems(detail: TrainingDetail): readonly TrainingPreviewItem[] {
  if (!detail.form) return []
  const fields = [
    ['objective', '훈련 목표'],
    ['description', '훈련 설명'],
    ['questionType', '문항 유형'],
    ['instruction', '진행 안내'],
    ['instructions', '진행 안내'],
  ] as const
  const seen = new Set<string>()

  return fields.flatMap(([key, label]) => {
    const value = detail.form?.[key]
    if (typeof value !== 'string' || !value.trim() || seen.has(label)) return []
    seen.add(label)
    return [
      {
        id: key,
        label,
        content: value.trim(),
        answer: null,
      },
    ]
  })
}

export function toTrainingPreview(detail: TrainingDetail | null): TrainingPreview {
  if (!detail) {
    return {
      source: 'empty',
      title: '미리보기',
      description: '저장된 실제 훈련을 선택하면 미리보기를 확인할 수 있습니다.',
      items: [],
    }
  }

  if (detail.generatedData) {
    const items = generatedItems(detail)
    return {
      source: 'generated',
      title: detail.name,
      description:
        items.length > 0
          ? '실제 생성된 훈련 자료입니다.'
          : '생성된 훈련 자료 형식을 화면에 표시할 수 없습니다.',
      items,
    }
  }

  const items = templateItems(detail)
  if (items.length > 0) {
    return {
      source: 'template',
      title: detail.name,
      description: '생성된 훈련 자료가 없어 템플릿 정보만 표시합니다.',
      items,
    }
  }

  return {
    source: 'empty',
    title: detail.name,
    description: '생성된 훈련 자료가 없습니다.',
    items: [],
  }
}

export function trainingStatusLabel(status: TrainingStatus): string {
  const labels: Record<TrainingStatus, string> = {
    NOT_READY: '준비 전',
    NOT_STARTED: '시작 전',
    IN_PROGRESS: '진행 중',
    COMPLETED: '완료',
  }
  return labels[status]
}

export function formatTrainingDuration(
  startedAt: string | null,
  finishedAt: string | null,
): string {
  if (!startedAt || !finishedAt) return '-'
  const durationMilliseconds = Date.parse(finishedAt) - Date.parse(startedAt)
  if (!Number.isFinite(durationMilliseconds) || durationMilliseconds < 0) return '-'
  const totalSeconds = Math.floor(durationMilliseconds / 1_000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}초`
  return seconds === 0 ? `${minutes}분` : `${minutes}분 ${seconds}초`
}

export function trainingDetailQuestions(
  detail: TrainingDetail | null,
): readonly TrainingQuestionResult[] {
  return Array.isArray(detail?.result?.questions) ? detail.result.questions : []
}

const responseTypeLabels: Readonly<Record<string, string>> = {
  SINGLE_CHOICE: '선택형',
  ORDERING: '순서 배열',
  COMPONENT_BUILD: '글자 조합',
  TEXT_INPUT: '텍스트 입력',
  TRACE: '따라 쓰기',
  AUDIO: '음성 응답',
}

const questionOptionLabels: Readonly<Record<string, string>> = {
  choices: '보기',
  cards: '카드',
  initialChoices: '초성 보기',
  medialChoices: '중성 보기',
  finalChoices: '종성 보기',
  words: '낱말',
  syllables: '음절',
  phrases: '어절',
  sentences: '문장',
}

const componentLabels: Readonly<Record<string, string>> = {
  INITIAL: '초성',
  MEDIAL: '중성',
  FINAL: '종성',
}

const componentChoiceFields: Readonly<Record<string, string>> = {
  INITIAL: 'initialChoices',
  MEDIAL: 'medialChoices',
  FINAL: 'finalChoices',
}

function formatStructuredValue(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const values = value.map(formatStructuredValue).filter((item): item is string => item !== null)
    return values.length > 0 ? values.join(' · ') : null
  }
  if (!isRecord(value)) return null

  const direct = firstDisplayValue(value, [
    'instruction',
    'prompt',
    'question',
    'text',
    'sentence',
    'word',
    'targetText',
    'target',
    'audioText',
    'targetAudioText',
    'title',
  ])
  if (direct) return direct

  const entries = Object.entries(value).flatMap(([key, item]) => {
    const formatted = formatStructuredValue(item)
    return formatted ? [`${key}: ${formatted}`] : []
  })
  return entries.length > 0 ? entries.join(' · ') : null
}

export function formatTrainingQuestionContent(value: TrainingQuestionValue): string {
  if (!isRecord(value)) return formatStructuredValue(value) ?? '문항 원본 없음'

  const parts: string[] = []
  const primary = firstDisplayValue(value, [
    'instruction',
    'prompt',
    'question',
    'text',
    'sentence',
    'word',
    'targetText',
    'target',
    'audioText',
    'targetAudioText',
    'title',
  ])
  if (primary) parts.push(primary)

  for (const [key, label] of Object.entries(questionOptionLabels)) {
    const options = value[key]
    if (!Array.isArray(options)) continue
    const formatted = options
      .map(formatStructuredValue)
      .filter((item): item is string => item !== null)
    if (formatted.length > 0) parts.push(`${label}: ${formatted.join(' / ')}`)
  }

  return parts.length > 0
    ? [...new Set(parts)].join(' · ')
    : (formatStructuredValue(value) ?? '문항 원본 없음')
}

function orderingAnswer(
  value: TrainingQuestionValue,
  question: TrainingQuestionValue,
): string | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'number')) return null
  const cards = isRecord(question) && Array.isArray(question.cards) ? question.cards : null
  const ordered = value.map((index) => {
    const card = cards?.[index]
    return formatStructuredValue(card) ?? `${index + 1}번 카드`
  })
  return ordered.length > 0 ? ordered.join(' → ') : null
}

function componentChoice(
  question: TrainingQuestionValue,
  slot: string,
  selectedIndex: number,
): string {
  const field = componentChoiceFields[slot]
  const choices =
    field && isRecord(question) && Array.isArray(question[field]) ? question[field] : null
  return formatStructuredValue(choices?.[selectedIndex]) ?? `${selectedIndex + 1}번 보기`
}

function componentAnswer(
  value: TrainingQuestionValue,
  question: TrainingQuestionValue,
): string | null {
  const selections: [string, number][] = []
  if (Array.isArray(value)) {
    for (const item of value) {
      if (
        !isRecord(item) ||
        typeof item.slot !== 'string' ||
        typeof item.selectedIndex !== 'number'
      ) {
        continue
      }
      selections.push([item.slot, item.selectedIndex])
    }
  } else if (isRecord(value)) {
    for (const [slot, selectedIndex] of Object.entries(value)) {
      if (typeof selectedIndex === 'number') selections.push([slot, selectedIndex])
    }
  }
  if (selections.length === 0) return null
  return selections
    .map(([slot, selectedIndex]) => {
      const label = componentLabels[slot] ?? slot
      return `${label}: ${componentChoice(question, slot, selectedIndex)}`
    })
    .join(' · ')
}

export function formatTrainingQuestionAnswer(
  value: TrainingQuestionValue,
  responseType: string | null,
  question: TrainingQuestionValue,
): string | null {
  if (value === null) return null
  if (responseType === 'TRACE' && isRecord(value)) return '따라 쓰기 응답 완료'
  if (responseType === 'ORDERING') {
    return orderingAnswer(value, question) ?? formatStructuredValue(value)
  }
  if (responseType === 'COMPONENT_BUILD') {
    return componentAnswer(value, question) ?? formatStructuredValue(value)
  }
  return formatStructuredValue(value)
}

export function trainingQuestionTypeLabel(question: TrainingHistoryQuestionResult): string {
  const responseLabel = question.responseType
    ? (responseTypeLabels[question.responseType] ?? question.responseType.replaceAll('_', ' '))
    : '응답 유형 없음'
  const questionType = question.questionType?.replaceAll('_', ' ') ?? '문항 유형 없음'
  return `${questionType} · ${responseLabel}`
}
