import type {
  TrainingDetail,
  TrainingPreview,
  TrainingPreviewItem,
  TrainingQuestionResult,
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
    const values = value
      .map(displayValue)
      .filter((item): item is string => item !== null)
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
      firstDisplayValue(problem, [
        'acceptedAnswers',
        'completedSentence',
        'result',
        'target',
      ])
    return [{
      id: String(question.questionId ?? question.id ?? index + 1),
      label: `문항 ${index + 1}`,
      content,
      answer: directAnswer,
    }]
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
    return [{
      id: key,
      label,
      content: value.trim(),
      answer: null,
    }]
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

export function trainingLearningAssessment(detail: TrainingDetail | null): string {
  const value = detail?.result?.learningAssessment
  return typeof value === 'string' && value.trim() ? value.trim() : '-'
}
