import type { TrainingDetail, TrainingPreview, TrainingPreviewItem } from './model'

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

function generatedItems(detail: TrainingDetail): readonly TrainingPreviewItem[] {
  const questions = detail.generatedData?.questions
  if (!Array.isArray(questions)) return []

  return questions.flatMap((question, index) => {
    if (!isRecord(question)) return []
    const problem = isRecord(question.problem) ? question.problem : question
    const answer = isRecord(question.answer) ? question.answer : {}
    const content = firstString(problem, [
      'targetText',
      'question',
      'prompt',
      'text',
      'sentence',
      'word',
    ])
    if (!content) return []
    return [{
      id: String(question.questionId ?? question.id ?? index + 1),
      label: `문항 ${index + 1}`,
      content,
      answer: firstString(answer, ['correctText', 'correctAnswer', 'answer', 'text']),
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
