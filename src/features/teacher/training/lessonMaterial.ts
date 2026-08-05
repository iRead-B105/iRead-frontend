import { ApiError } from '@/lib/api'
import type {
  CurriculumTraining,
  EditableLessonMaterialItem,
  LessonMaterialDocument,
  LessonMaterialItem,
  LessonMaterialPresentation,
  SaveLessonMaterialRequest,
  TrainingDetail,
} from './model'
import { defaultLessonMaterialData, validateLessonMaterialItem } from './lessonMaterialEditor'

export const LESSON_MATERIAL_MIN_COUNT = 1
export const LESSON_MATERIAL_MAX_COUNT = 5
export const LESSON_MATERIAL_COUNT = LESSON_MATERIAL_MAX_COUNT

export const LESSON_QUESTION_TYPES = [
  'VOWEL_TRACE',
  'CONSONANT_TRACE',
  'SYLLABLE_TRACE',
  'CONSONANT_SOUND_CHOICE',
  'VOWEL_SOUND_CHOICE',
  'CONSONANT_VOWEL_CLASSIFICATION',
  'SYLLABLE_INITIAL_CHOICE',
  'WORD_INITIAL_CHOICE',
  'SAME_INITIAL_WORD_CHOICE',
  'FINAL_CONSONANT_CHOICE',
  'WORD_FINAL_SOUND_CHOICE',
  'FINAL_CONSONANT_COMPARISON',
  'SIMILAR_SOUND_CHOICE',
  'PHONEME_BLEND',
  'SYLLABLE_BLEND',
  'BASIC_SYLLABLE_BUILD',
  'FINAL_SYLLABLE_BUILD',
  'DOUBLE_FINAL_BUILD',
  'FINAL_CONSONANT_DELETE',
  'SYLLABLE_DELETE',
  'SYLLABLE_REPLACE',
  'WORD_READING',
  'NONWORD_READING',
  'DIFFICULT_WORD_PREVIEW',
  'SENTENCE_READING',
  'SHORT_PASSAGE_READING',
  'SENTENCE_ASSEMBLY',
  'FILL_IN_THE_BLANK',
  'IMAGE_SENTENCE_MATCH',
  'SENTENCE_REPEAT',
  'WORD_CHAIN_READING',
  'PHRASE_READING',
  'REPEATED_SENTENCE_READING',
  'SHORT_STORY_READING',
] as const

export type LessonQuestionType = (typeof LESSON_QUESTION_TYPES)[number]

const RESPONSE_TYPE_BY_QUESTION_TYPE: Readonly<Record<LessonQuestionType, string>> = {
  VOWEL_TRACE: 'TRACE',
  CONSONANT_TRACE: 'TRACE',
  SYLLABLE_TRACE: 'TRACE',
  CONSONANT_SOUND_CHOICE: 'SINGLE_CHOICE',
  VOWEL_SOUND_CHOICE: 'SINGLE_CHOICE',
  CONSONANT_VOWEL_CLASSIFICATION: 'SINGLE_CHOICE',
  SYLLABLE_INITIAL_CHOICE: 'SINGLE_CHOICE',
  WORD_INITIAL_CHOICE: 'SINGLE_CHOICE',
  SAME_INITIAL_WORD_CHOICE: 'SINGLE_CHOICE',
  FINAL_CONSONANT_CHOICE: 'SINGLE_CHOICE',
  WORD_FINAL_SOUND_CHOICE: 'SINGLE_CHOICE',
  FINAL_CONSONANT_COMPARISON: 'SINGLE_CHOICE',
  SIMILAR_SOUND_CHOICE: 'SINGLE_CHOICE',
  PHONEME_BLEND: 'ORDERING',
  SYLLABLE_BLEND: 'ORDERING',
  BASIC_SYLLABLE_BUILD: 'COMPONENT_BUILD',
  FINAL_SYLLABLE_BUILD: 'COMPONENT_BUILD',
  DOUBLE_FINAL_BUILD: 'COMPONENT_BUILD',
  FINAL_CONSONANT_DELETE: 'SINGLE_CHOICE',
  SYLLABLE_DELETE: 'SINGLE_CHOICE',
  SYLLABLE_REPLACE: 'SINGLE_CHOICE',
  WORD_READING: 'AUDIO',
  NONWORD_READING: 'AUDIO',
  DIFFICULT_WORD_PREVIEW: 'AUDIO',
  SENTENCE_READING: 'AUDIO',
  SHORT_PASSAGE_READING: 'AUDIO',
  SENTENCE_ASSEMBLY: 'ORDERING',
  FILL_IN_THE_BLANK: 'SINGLE_CHOICE',
  IMAGE_SENTENCE_MATCH: 'SINGLE_CHOICE',
  SENTENCE_REPEAT: 'AUDIO',
  WORD_CHAIN_READING: 'AUDIO',
  PHRASE_READING: 'AUDIO',
  REPEATED_SENTENCE_READING: 'AUDIO',
  SHORT_STORY_READING: 'AUDIO',
}

const REQUIRED_INPUTS_BY_TEMPLATE_ID: Readonly<Record<number, readonly string[]>> = {
  1: ['VOICE', 'GAZE'],
  2: ['VOICE', 'GAZE'],
  3: ['VOICE', 'GAZE'],
  22: ['VOICE', 'GAZE'],
  23: ['VOICE', 'GAZE'],
  24: ['VOICE', 'GAZE'],
  25: ['VOICE', 'GAZE'],
  26: ['VOICE', 'GAZE'],
  30: ['VOICE', 'GAZE'],
  31: ['VOICE', 'GAZE'],
  32: ['VOICE', 'GAZE'],
  33: ['VOICE', 'GAZE'],
  34: ['VOICE', 'GAZE'],
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function questionTypeForTemplate(trainingTemplateId: number): LessonQuestionType {
  return LESSON_QUESTION_TYPES[trainingTemplateId - 1] ?? 'WORD_READING'
}

function presentationFrom(
  value: unknown,
  trainingName: string,
  questionNo: number,
): LessonMaterialPresentation {
  const source = isRecord(value) ? value : {}
  return {
    activityName: stringValue(source.activityName) || `${trainingName} ${questionNo}`,
    instruction: stringValue(source.instruction) || '화면의 안내에 따라 활동해 보세요.',
    hint: stringValue(source.hint),
    correctFeedback: stringValue(source.correctFeedback) || '잘했어요.',
    retryFeedback: stringValue(source.retryFeedback) || '한 번 더 생각해 보세요.',
  }
}

function legacyQuestions(detail: TrainingDetail): readonly Readonly<Record<string, unknown>>[] {
  const questions = detail.generatedData?.questions
  return Array.isArray(questions) ? questions.filter(isRecord) : []
}

export function createLessonMaterialDocumentFromLegacy(
  training: CurriculumTraining,
  detail: TrainingDetail,
): LessonMaterialDocument {
  const questionType = questionTypeForTemplate(training.trainingTemplateId)
  const questions = legacyQuestions(detail).slice(0, LESSON_MATERIAL_COUNT)
  const sourceQuestions = Array.from(
    { length: LESSON_MATERIAL_COUNT },
    (_, index) => questions[index] ?? {},
  )
  const materials = sourceQuestions.map<LessonMaterialItem>((question, index) => {
    const defaults = defaultLessonMaterialData(questionType)
    const legacyContent = isRecord(question.content)
      ? question.content
      : isRecord(question.problem)
        ? question.problem
        : {}
    const legacyAnswer = isRecord(question.answer) ? question.answer : {}
    return {
      questionNo: index + 1,
      questionType,
      responseType: RESPONSE_TYPE_BY_QUESTION_TYPE[questionType],
      requiredInputs: REQUIRED_INPUTS_BY_TEMPLATE_ID[training.trainingTemplateId] ?? [],
      presentation: presentationFrom(question.presentation, training.trainingName, index + 1),
      content: {
        ...cloneJson(defaults.content),
        ...cloneJson(legacyContent),
      },
      answer: {
        ...cloneJson(defaults.answer),
        ...cloneJson(legacyAnswer),
      },
    }
  })

  return {
    trainingId: training.trainingId,
    trainingTemplateId: training.trainingTemplateId,
    trainingName: training.trainingName,
    unitName: training.unitName,
    status: detail.status,
    schemaVersion: 2,
    revision: 1,
    editable: detail.status === 'NOT_READY' || detail.status === 'NOT_STARTED',
    materials,
  }
}

export function editableItem(item: LessonMaterialItem): EditableLessonMaterialItem {
  return {
    questionNo: item.questionNo,
    questionType: item.questionType,
    presentation: cloneJson(item.presentation),
    content: cloneJson(item.content),
    answer: cloneJson(item.answer),
  }
}

export function saveRequestFromDocument(
  document: LessonMaterialDocument,
): SaveLessonMaterialRequest {
  return {
    revision: document.revision,
    materials: document.materials.map(editableItem),
  }
}

export function normalizeLessonMaterialDocument(
  document: LessonMaterialDocument,
): LessonMaterialDocument {
  return {
    ...document,
    materials: document.materials.map((material) => ({
      ...material,
      presentation: presentationFrom(
        material.presentation,
        document.trainingName,
        material.questionNo,
      ),
    })),
  }
}

export function cloneLessonMaterialDocument(
  document: LessonMaterialDocument,
): LessonMaterialDocument {
  return cloneJson(document)
}

export function assertLessonMaterialResponseCount<
  T extends { readonly materials: readonly unknown[] },
>(response: T): T {
  if (
    response.materials.length < LESSON_MATERIAL_MIN_COUNT ||
    response.materials.length > LESSON_MATERIAL_MAX_COUNT
  ) {
    throw new ApiError({
      status: 502,
      code: 'LESSON_MATERIAL_CONTRACT_MISMATCH',
      message: `교안 조회 결과는 ${LESSON_MATERIAL_MIN_COUNT}~${LESSON_MATERIAL_MAX_COUNT}개 자료여야 합니다.`,
    })
  }
  return response
}

export function assertLessonMaterialRequestCount(request: SaveLessonMaterialRequest): void {
  if (
    request.materials.length < LESSON_MATERIAL_MIN_COUNT ||
    request.materials.length > LESSON_MATERIAL_MAX_COUNT
  ) {
    throw new ApiError({
      status: 422,
      code: 'LESSON_MATERIAL_VALIDATION_FAILED',
      message: `교안 자료는 ${LESSON_MATERIAL_MIN_COUNT}~${LESSON_MATERIAL_MAX_COUNT}개여야 합니다.`,
    })
  }
}

export function assertSaveLessonMaterialRequest(
  request: SaveLessonMaterialRequest,
  current: LessonMaterialDocument,
): void {
  if (!current.editable) {
    throw new ApiError({
      status: 409,
      code: 'TRAINING_NOT_EDITABLE',
      message: '진행 중이거나 완료된 훈련의 교안은 수정할 수 없습니다.',
    })
  }
  if (request.revision !== current.revision) {
    throw new ApiError({
      status: 409,
      code: 'LESSON_MATERIAL_REVISION_CONFLICT',
      message: '교안이 다른 화면에서 변경되었습니다. 최신 교안을 다시 불러와 주세요.',
    })
  }
  assertLessonMaterialRequestCount(request)

  const expectedType = current.materials[0]?.questionType
  for (const [index, material] of request.materials.entries()) {
    if (material.questionType !== expectedType) {
      throw new ApiError({
        status: 422,
        code: 'LESSON_MATERIAL_VALIDATION_FAILED',
        message: `${index + 1}번 자료의 문항 유형은 변경할 수 없습니다.`,
      })
    }
    if (!isRecord(material.content) || !isRecord(material.answer)) {
      throw new ApiError({
        status: 422,
        code: 'LESSON_MATERIAL_VALIDATION_FAILED',
        message: `${index + 1}번 자료의 내용 또는 정답 형식이 올바르지 않습니다.`,
      })
    }
    if (!material.presentation.activityName.trim() || !material.presentation.instruction.trim()) {
      throw new ApiError({
        status: 422,
        code: 'LESSON_MATERIAL_VALIDATION_FAILED',
        message: `${index + 1}번 자료의 활동 이름과 지시문을 입력해 주세요.`,
      })
    }
    const issue = validateLessonMaterialItem(material)[0]
    if (issue) {
      throw new ApiError({
        status: 422,
        code: 'LESSON_MATERIAL_VALIDATION_FAILED',
        message: `${index + 1}번 자료의 ${issue.message}`,
      })
    }
  }
}

export function normalizeSavedMaterials(
  request: SaveLessonMaterialRequest,
  current: LessonMaterialDocument,
): readonly LessonMaterialItem[] {
  const policy = current.materials[0]
  if (!policy) return []
  return request.materials.map((item, index) => ({
    ...cloneJson(item),
    questionNo: index + 1,
    responseType: policy.responseType,
    requiredInputs: [...policy.requiredInputs],
  }))
}
