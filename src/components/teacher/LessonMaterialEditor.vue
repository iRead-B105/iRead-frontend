<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  LESSON_MATERIAL_MAX_COUNT,
  LESSON_MATERIAL_MIN_COUNT,
  editableItem,
  newEditableMaterialLike,
  trainingStatusLabel,
  type CurriculumTraining,
  type EditableLessonMaterialItem,
  type ExpectedWord,
  type LessonMaterialDocument,
  type LessonMaterialPresentation,
  type SaveLessonMaterialRequest,
  type TrainingDetail,
  type TrainingRequestStatus,
} from '@/features/teacher/training'

interface MaterialDraft {
  questionNo: number
  questionType: string
  presentation: LessonMaterialPresentation
  content: Record<string, unknown>
  answer: Record<string, unknown>
}

const props = defineProps<{
  training: CurriculumTraining
  attemptLabel: string
  expectedWords: readonly ExpectedWord[]
  detail: TrainingDetail | null
  lessonMaterial: LessonMaterialDocument | null
  expectedWordsStatus: TrainingRequestStatus
  detailStatus: TrainingRequestStatus
  lessonMaterialStatus: TrainingRequestStatus
  lessonMaterialSaveStatus: TrainingRequestStatus
  materialGenerationStatus: TrainingRequestStatus
  requiresRegeneration: boolean
  isMutating: boolean
  isSavingLessonMaterial: boolean
  expectedWordError: string | null
  detailError: string | null
  lessonMaterialError: string | null
  lessonMaterialSaveError: string | null
  materialGenerationError: string | null
}>()

const emit = defineEmits<{
  close: []
  addWord: [wordName: string]
  deleteWord: [wordId: number]
  regenerate: []
  retry: []
  save: [request: SaveLessonMaterialRequest]
}>()

const FIELD_LABELS: Readonly<Record<string, string>> = {
  activityName: '활동 이름',
  instruction: '활동 지시문',
  hint: '힌트',
  correctFeedback: '정답 피드백',
  retryFeedback: '재시도 피드백',
  targetText: '제시 내용',
  audioText: '재생 문구',
  targetAudioText: 'TTS 재생 문구',
  choices: '선택지',
  sentenceChoices: '문장 선택지',
  wordChoices: '낱말 선택지',
  initialChoices: '초성 선택지',
  medialChoices: '중성 선택지',
  finalChoices: '종성 선택지',
  answerIndex: '정답 위치',
  correctText: '정답 기준 문구',
  result: '완성 정답',
  imagePrompt: '이미지 생성 설명',
  imageUrl: '이미지 주소',
  imageAssetKey: '이미지 에셋 키',
  audioUrl: '음성 파일 주소',
  audioAssetKey: '음성 에셋 키',
  traceAssetKey: '따라쓰기 에셋 키',
}

const newWord = ref('')
const submittedWord = ref<string | null>(null)
const wordPendingDeletion = ref<ExpectedWord | null>(null)
const materialPendingDeletion = ref<number | null>(null)
const closePending = ref(false)
const selectedMaterialIndex = ref(0)
const draftMaterials = ref<MaterialDraft[]>([])
const complexTexts = ref<Record<string, string>>({})
const complexErrors = ref<Record<string, string>>({})

const normalizedWord = computed(() => newWord.value.trim())
const canEditExpectedWords = computed(
  () => props.training.status === 'NOT_READY' || props.training.status === 'NOT_STARTED',
)
const canEditMaterial = computed(
  () =>
    Boolean(props.lessonMaterial?.editable) &&
    props.lessonMaterialStatus === 'success' &&
    !props.isSavingLessonMaterial,
)
const willRequireRegenerationAfterChange = computed(
  () => props.training.status === 'NOT_STARTED',
)
const isGenerating = computed(() => props.materialGenerationStatus === 'loading')
const isBusy = computed(() => props.isMutating || isGenerating.value)
const canGenerate = computed(
  () =>
    props.requiresRegeneration &&
    props.detailStatus === 'success' &&
    props.expectedWordsStatus === 'success' &&
    !isBusy.value,
)
const selectedDraft = computed(() => draftMaterials.value[selectedMaterialIndex.value] ?? null)
const selectedPolicy = computed(
  () => props.lessonMaterial?.materials[selectedMaterialIndex.value] ?? null,
)

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function toDraft(item: EditableLessonMaterialItem): MaterialDraft {
  return {
    questionNo: item.questionNo,
    questionType: item.questionType,
    presentation: cloneJson(item.presentation),
    content: cloneJson(item.content),
    answer: cloneJson(item.answer),
  }
}

function requestFromDraft(): SaveLessonMaterialRequest | null {
  if (!props.lessonMaterial) return null
  return {
    revision: props.lessonMaterial.revision,
    materials: draftMaterials.value.map((material, index) => ({
      questionNo: index + 1,
      questionType: material.questionType,
      presentation: cloneJson(material.presentation),
      content: cloneJson(material.content),
      answer: cloneJson(material.answer),
    })),
  }
}

const savedRequest = computed(() =>
  props.lessonMaterial
    ? {
        revision: props.lessonMaterial.revision,
        materials: props.lessonMaterial.materials.map(editableItem),
      }
    : null,
)
const hasChanges = computed(
  () => JSON.stringify(requestFromDraft()) !== JSON.stringify(savedRequest.value),
)
const materialValidationError = computed(() => {
  if (!props.lessonMaterial || props.lessonMaterialStatus !== 'success') return null
  if (
    draftMaterials.value.length < LESSON_MATERIAL_MIN_COUNT ||
    draftMaterials.value.length > LESSON_MATERIAL_MAX_COUNT
  ) {
    return `학습 자료는 ${LESSON_MATERIAL_MIN_COUNT}~${LESSON_MATERIAL_MAX_COUNT}개로 구성해 주세요.`
  }
  if (Object.keys(complexErrors.value).length > 0) {
    return 'JSON 형식이 올바르지 않은 입력란을 확인해 주세요.'
  }
  const invalidIndex = draftMaterials.value.findIndex(
    (material) =>
      !material.presentation.activityName.trim() || !material.presentation.instruction.trim(),
  )
  return invalidIndex >= 0 ? `${invalidIndex + 1}번 자료의 활동 이름과 지시문을 입력해 주세요.` : null
})
const canSave = computed(
  () => canEditMaterial.value && hasChanges.value && !materialValidationError.value,
)

function resetDraft(document: LessonMaterialDocument | null): void {
  draftMaterials.value = document?.materials.map((item) => toDraft(editableItem(item))) ?? []
  selectedMaterialIndex.value = Math.min(
    selectedMaterialIndex.value,
    Math.max(0, draftMaterials.value.length - 1),
  )
  complexTexts.value = {}
  complexErrors.value = {}
}

watch(
  () => props.lessonMaterial,
  (document) => resetDraft(document),
  { immediate: true, deep: true },
)

watch(
  () => props.expectedWords,
  (words) => {
    if (submittedWord.value && words.some((word) => word.wordName === submittedWord.value)) {
      newWord.value = ''
      submittedWord.value = null
    }
    if (
      wordPendingDeletion.value &&
      !words.some((word) => word.wordId === wordPendingDeletion.value?.wordId)
    ) {
      wordPendingDeletion.value = null
    }
  },
  { deep: true },
)

const wordValidationError = computed(() => {
  if (!newWord.value) return null
  if (!normalizedWord.value) return '공백만 입력할 수 없습니다.'
  if (normalizedWord.value.length > 50) return '예상 단어는 최대 50자입니다.'
  if (props.expectedWords.some((word) => word.wordName === normalizedWord.value)) {
    return '이미 추가한 예상 단어입니다.'
  }
  return null
})
const canAddWord = computed(
  () =>
    Boolean(normalizedWord.value) &&
    !wordValidationError.value &&
    canEditExpectedWords.value &&
    !isBusy.value,
)

function addWord(): void {
  if (!canAddWord.value) return
  submittedWord.value = normalizedWord.value
  emit('addWord', normalizedWord.value)
}

function confirmDeleteWord(): void {
  if (!wordPendingDeletion.value || !canEditExpectedWords.value || isBusy.value) return
  emit('deleteWord', wordPendingDeletion.value.wordId)
}

function addMaterial(): void {
  const source = props.lessonMaterial?.materials[0]
  if (!source || !canEditMaterial.value || draftMaterials.value.length >= LESSON_MATERIAL_MAX_COUNT) {
    return
  }
  draftMaterials.value.push(toDraft(newEditableMaterialLike(source, draftMaterials.value.length + 1)))
  selectedMaterialIndex.value = draftMaterials.value.length - 1
}

function confirmDeleteMaterial(): void {
  if (
    materialPendingDeletion.value === null ||
    !canEditMaterial.value ||
    draftMaterials.value.length <= LESSON_MATERIAL_MIN_COUNT
  ) {
    return
  }
  draftMaterials.value.splice(materialPendingDeletion.value, 1)
  draftMaterials.value.forEach((material, index) => {
    material.questionNo = index + 1
  })
  selectedMaterialIndex.value = Math.min(
    selectedMaterialIndex.value,
    draftMaterials.value.length - 1,
  )
  materialPendingDeletion.value = null
}

function moveMaterial(offset: -1 | 1): void {
  const from = selectedMaterialIndex.value
  const to = from + offset
  if (!canEditMaterial.value || to < 0 || to >= draftMaterials.value.length) return
  const [moved] = draftMaterials.value.splice(from, 1)
  if (!moved) return
  draftMaterials.value.splice(to, 0, moved)
  draftMaterials.value.forEach((material, index) => {
    material.questionNo = index + 1
  })
  selectedMaterialIndex.value = to
}

function updatePresentation(key: keyof LessonMaterialPresentation, value: string): void {
  const material = selectedDraft.value
  if (!material || !canEditMaterial.value) return
  material.presentation = { ...material.presentation, [key]: value }
}

function updateField(section: 'content' | 'answer', key: string, value: unknown): void {
  const material = selectedDraft.value
  if (!material || !canEditMaterial.value || isProtectedField(key)) return
  material[section] = { ...material[section], [key]: value }
}

function updateArrayValue(
  section: 'content' | 'answer',
  key: string,
  index: number,
  value: string,
): void {
  const current = selectedDraft.value?.[section][key]
  if (!Array.isArray(current)) return
  const next = [...current]
  next[index] = value
  updateField(section, key, next)
}

function addArrayValue(section: 'content' | 'answer', key: string): void {
  const current = selectedDraft.value?.[section][key]
  if (!Array.isArray(current)) return
  updateField(section, key, [...current, ''])
}

function deleteArrayValue(section: 'content' | 'answer', key: string, index: number): void {
  const current = selectedDraft.value?.[section][key]
  if (!Array.isArray(current)) return
  updateField(
    section,
    key,
    current.filter((_, candidateIndex) => candidateIndex !== index),
  )
}

function complexKey(section: 'content' | 'answer', key: string): string {
  return `${selectedMaterialIndex.value}:${section}:${key}`
}

function complexText(section: 'content' | 'answer', key: string, value: unknown): string {
  return complexTexts.value[complexKey(section, key)] ?? JSON.stringify(value, null, 2)
}

function updateComplexField(
  section: 'content' | 'answer',
  key: string,
  event: Event,
): void {
  const value = (event.target as HTMLTextAreaElement).value
  const id = complexKey(section, key)
  complexTexts.value = { ...complexTexts.value, [id]: value }
  try {
    const parsed = JSON.parse(value)
    const remaining = { ...complexErrors.value }
    delete remaining[id]
    complexErrors.value = remaining
    updateField(section, key, parsed)
  } catch {
    complexErrors.value = { ...complexErrors.value, [id]: '올바른 JSON 형식으로 입력해 주세요.' }
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isProtectedField(key: string): boolean {
  return /^(imagePrompt|imageUrl|imageAssetKey|audioUrl|audioAssetKey|traceAssetKey)$/i.test(key)
}

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(' · ')
  if (typeof value === 'object' && value !== null) return JSON.stringify(value)
  if (value === null || value === undefined || value === '') return '입력 없음'
  return String(value)
}

function saveMaterial(): void {
  const request = requestFromDraft()
  if (!request || !canSave.value) return
  emit('save', request)
}

function requestClose(): void {
  if (hasChanges.value) {
    closePending.value = true
    return
  }
  emit('close')
}

function confirmClose(): void {
  closePending.value = false
  emit('close')
}
</script>

<template>
  <Dialog :open="true" @update:open="(open) => !open && requestClose()">
    <DialogContent
      class="material-dialog !max-w-none !gap-0 !overflow-hidden !bg-transparent !p-0 !ring-0"
      :show-close-button="false"
    >
      <div class="material-editor">
        <header class="editor-header">
          <div>
            <span>{{ attemptLabel }} · {{ training.unitName }}</span>
            <DialogTitle as-child>
              <h2>{{ training.trainingName }}</h2>
            </DialogTitle>
            <DialogDescription class="sr-only">
              교안 자료의 내용과 정답 기준을 수정하고 아동 화면을 미리 확인합니다.
            </DialogDescription>
          </div>
          <div class="editor-header__actions">
            <Badge variant="secondary">{{ trainingStatusLabel(training.status) }}</Badge>
            <Button variant="ghost" size="icon" type="button" aria-label="교안 편집 닫기" @click="requestClose">
              ×
            </Button>
          </div>
        </header>

        <div class="editor-workspace">
          <section class="edit-panel" aria-labelledby="material-edit-title">
            <header class="section-header">
              <div>
                <p>{{ canEditMaterial ? '편집 가능' : '읽기 전용' }}</p>
                <h3 id="material-edit-title">학습 자료</h3>
              </div>
              <Button
                v-if="lessonMaterial"
                variant="outline"
                size="sm"
                type="button"
                :disabled="!canEditMaterial || draftMaterials.length >= LESSON_MATERIAL_MAX_COUNT"
                @click="addMaterial"
              >
                + 자료 추가
              </Button>
            </header>

            <p v-if="lessonMaterialStatus === 'loading'" class="section-state" role="status">
              교안 편집 자료를 불러오는 중입니다.
            </p>
            <div v-else-if="lessonMaterialStatus === 'error'" class="section-error" role="alert">
              <p>{{ lessonMaterialError }}</p>
              <Button variant="outline" size="sm" type="button" @click="emit('retry')">다시 시도</Button>
            </div>
            <template v-else-if="lessonMaterial">
              <div class="material-toolbar">
                <div class="material-tabs" role="tablist" aria-label="학습 자료 선택">
                  <button
                    v-for="(material, index) in draftMaterials"
                    :key="`${material.questionType}-${index}`"
                    type="button"
                    role="tab"
                    :aria-selected="selectedMaterialIndex === index"
                    :class="{ active: selectedMaterialIndex === index }"
                    @click="selectedMaterialIndex = index"
                  >
                    자료 {{ index + 1 }}
                  </button>
                </div>
                <div class="order-actions">
                  <Button variant="outline" size="sm" type="button" :disabled="!canEditMaterial || selectedMaterialIndex === 0" @click="moveMaterial(-1)">
                    이전
                  </Button>
                  <Button variant="outline" size="sm" type="button" :disabled="!canEditMaterial || selectedMaterialIndex >= draftMaterials.length - 1" @click="moveMaterial(1)">
                    다음
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    :disabled="!canEditMaterial || draftMaterials.length <= LESSON_MATERIAL_MIN_COUNT"
                    @click="materialPendingDeletion = selectedMaterialIndex"
                  >
                    삭제
                  </Button>
                </div>
              </div>

              <div v-if="selectedDraft" class="material-form">
                <div class="policy-row">
                  <div>
                    <small>문항 유형</small>
                    <strong>{{ selectedDraft.questionType }}</strong>
                  </div>
                  <div>
                    <small>응답 방식</small>
                    <strong>{{ selectedPolicy?.responseType ?? '확인 중' }}</strong>
                  </div>
                  <div>
                    <small>필수 입력</small>
                    <strong>{{ selectedPolicy?.requiredInputs.join(', ') || '없음' }}</strong>
                  </div>
                </div>

                <fieldset :disabled="!canEditMaterial">
                  <legend>화면 표시</legend>
                  <label>
                    활동 이름
                    <Input :model-value="selectedDraft.presentation.activityName" @update:model-value="updatePresentation('activityName', String($event))" />
                  </label>
                  <label class="wide-field">
                    활동 지시문
                    <textarea :value="selectedDraft.presentation.instruction" rows="2" @input="updatePresentation('instruction', ($event.target as HTMLTextAreaElement).value)" />
                  </label>
                  <label class="wide-field">
                    힌트
                    <textarea :value="selectedDraft.presentation.hint" rows="2" @input="updatePresentation('hint', ($event.target as HTMLTextAreaElement).value)" />
                  </label>
                  <label>
                    정답 피드백
                    <Input :model-value="selectedDraft.presentation.correctFeedback" @update:model-value="updatePresentation('correctFeedback', String($event))" />
                  </label>
                  <label>
                    재시도 피드백
                    <Input :model-value="selectedDraft.presentation.retryFeedback" @update:model-value="updatePresentation('retryFeedback', String($event))" />
                  </label>
                </fieldset>

                <fieldset
                  v-for="section in (['content', 'answer'] as const)"
                  :key="section"
                  :disabled="!canEditMaterial"
                >
                  <legend>{{ section === 'content' ? '문항 내용' : '정답 기준' }}</legend>
                  <p v-if="Object.keys(selectedDraft[section]).length === 0" class="empty-fields">
                    이 자료에는 아직 {{ section === 'content' ? '문항 내용' : '정답 기준' }} 필드가 없습니다.
                  </p>
                  <div
                    v-for="[key, value] in Object.entries(selectedDraft[section])"
                    :key="key"
                    class="dynamic-field wide-field"
                  >
                    <label :for="`${section}-${key}`">{{ labelFor(key) }}</label>
                    <div v-if="isProtectedField(key)" :id="`${section}-${key}`" class="readonly-value">
                      {{ displayValue(value) }}
                      <small>Backend 또는 미디어 정책이 관리하는 읽기 전용 값입니다.</small>
                    </div>
                    <div v-else-if="isStringArray(value)" class="array-field">
                      <div v-for="(choice, choiceIndex) in value" :key="choiceIndex">
                        <Input
                          :id="choiceIndex === 0 ? `${section}-${key}` : undefined"
                          :model-value="choice"
                          :aria-label="`${labelFor(key)} ${choiceIndex + 1}`"
                          @update:model-value="updateArrayValue(section, key, choiceIndex, String($event))"
                        />
                        <Button variant="ghost" size="icon-sm" type="button" :aria-label="`${labelFor(key)} ${choiceIndex + 1} 삭제`" @click="deleteArrayValue(section, key, choiceIndex)">×</Button>
                      </div>
                      <Button variant="outline" size="sm" type="button" @click="addArrayValue(section, key)">+ 항목 추가</Button>
                    </div>
                    <Input
                      v-else-if="typeof value === 'string'"
                      :id="`${section}-${key}`"
                      :model-value="value"
                      @update:model-value="updateField(section, key, String($event))"
                    />
                    <Input
                      v-else-if="typeof value === 'number'"
                      :id="`${section}-${key}`"
                      type="number"
                      :model-value="String(value)"
                      @update:model-value="updateField(section, key, Number($event))"
                    />
                    <input
                      v-else-if="typeof value === 'boolean'"
                      :id="`${section}-${key}`"
                      type="checkbox"
                      :checked="value"
                      @change="updateField(section, key, ($event.target as HTMLInputElement).checked)"
                    />
                    <div v-else>
                      <textarea
                        :id="`${section}-${key}`"
                        :value="complexText(section, key, value)"
                        rows="5"
                        :aria-invalid="Boolean(complexErrors[complexKey(section, key)])"
                        @input="updateComplexField(section, key, $event)"
                      />
                      <small v-if="complexErrors[complexKey(section, key)]" class="inline-error" role="alert">
                        {{ complexErrors[complexKey(section, key)] }}
                      </small>
                    </div>
                  </div>
                </fieldset>
              </div>
            </template>

            <details class="word-settings">
              <summary>AI 재생성 설정 · 예상 단어 {{ expectedWords.length }}개</summary>
              <form class="word-form" @submit.prevent="addWord">
                <label for="expected-word">새 예상 단어</label>
                <div>
                  <Input
                    id="expected-word"
                    v-model="newWord"
                    maxlength="51"
                    autocomplete="off"
                    placeholder="최대 50자"
                    :disabled="!canEditExpectedWords || isBusy"
                    :aria-invalid="Boolean(wordValidationError)"
                  />
                  <Button type="submit" :disabled="!canAddWord">추가</Button>
                </div>
                <small :class="{ error: wordValidationError }">{{ wordValidationError ?? `${normalizedWord.length}/50자` }}</small>
              </form>
              <p v-if="expectedWordsStatus === 'loading'" class="section-state">예상 단어를 불러오는 중입니다.</p>
              <div v-else-if="expectedWordsStatus === 'error'" class="section-error" role="alert">
                <p>{{ expectedWordError }}</p>
                <Button variant="outline" size="sm" type="button" @click="emit('retry')">다시 시도</Button>
              </div>
              <ul v-else class="word-list">
                <li v-for="word in expectedWords" :key="word.wordId">
                  <span>{{ word.wordName }}</span>
                  <Button variant="ghost" size="icon-sm" type="button" :aria-label="`${word.wordName} 예상 단어 삭제`" :disabled="!canEditExpectedWords || isBusy" @click="wordPendingDeletion = word">×</Button>
                </li>
              </ul>
              <p v-if="expectedWordError && expectedWordsStatus !== 'error'" class="inline-error" role="alert">{{ expectedWordError }}</p>
              <p v-if="!canEditExpectedWords" class="word-help">진행 중이거나 완료된 훈련은 예상 단어를 변경할 수 없습니다.</p>
              <p v-else-if="willRequireRegenerationAfterChange" class="word-help">예상 단어를 변경하면 AI 교안 재생성이 필요합니다.</p>
            </details>
          </section>

          <section class="preview-panel" aria-labelledby="preview-title">
            <header class="section-header">
              <div>
                <p>동일 데이터 미리보기</p>
                <h3 id="preview-title">아동 화면</h3>
              </div>
              <Badge v-if="requiresRegeneration" variant="destructive">재생성 필요</Badge>
              <Badge v-else variant="outline">자료 {{ selectedMaterialIndex + 1 }} / {{ draftMaterials.length }}</Badge>
            </header>

            <div v-if="requiresRegeneration" class="generation-notice" :class="{ error: materialGenerationStatus === 'error' }">
              <div>
                <strong>AI 교안 재생성이 필요합니다.</strong>
                <span>{{ materialGenerationError ?? '예상 단어 변경 내용을 새 교안에 반영해 주세요.' }}</span>
              </div>
              <Button type="button" :disabled="!canGenerate" @click="emit('regenerate')">
                {{ isGenerating ? '생성 중' : 'AI 교안 재생성' }}
              </Button>
            </div>

            <div class="preview-device">
              <div class="preview-device__top">
                <span>iRead 학습</span>
                <small>{{ selectedDraft?.questionType ?? '자료 없음' }}</small>
              </div>
              <div v-if="selectedDraft" class="preview-content">
                <small>{{ training.unitName }}</small>
                <h4>{{ selectedDraft.presentation.activityName || training.trainingName }}</h4>
                <p>{{ selectedDraft.presentation.instruction || '활동 지시문을 입력해 주세요.' }}</p>
                <div class="preview-card">
                  <dl>
                    <template v-for="[key, value] in Object.entries(selectedDraft.content)" :key="key">
                      <dt>{{ labelFor(key) }}</dt>
                      <dd>{{ displayValue(value) }}</dd>
                    </template>
                  </dl>
                  <p v-if="selectedDraft.presentation.hint" class="preview-hint">힌트 · {{ selectedDraft.presentation.hint }}</p>
                </div>
                <details class="answer-preview">
                  <summary>정답 기준 확인</summary>
                  <dl>
                    <template v-for="[key, value] in Object.entries(selectedDraft.answer)" :key="key">
                      <dt>{{ labelFor(key) }}</dt>
                      <dd>{{ displayValue(value) }}</dd>
                    </template>
                  </dl>
                </details>
              </div>
              <div v-else class="preview-empty">표시할 교안 자료가 없습니다.</div>
            </div>
          </section>
        </div>

        <footer class="editor-footer">
          <div>
            <p v-if="materialValidationError" class="inline-error" role="alert">{{ materialValidationError }}</p>
            <p v-else-if="lessonMaterialSaveError" class="inline-error" role="alert">{{ lessonMaterialSaveError }}</p>
            <p v-else-if="lessonMaterialSaveStatus === 'success'" class="save-success" role="status">교안이 저장되었습니다.</p>
            <p v-else>{{ lessonMaterial?.editable ? '수정 내용은 전체 자료 단위로 저장됩니다.' : '현재 훈련은 읽기 전용입니다.' }}</p>
          </div>
          <div>
            <Button variant="outline" type="button" @click="requestClose">취소</Button>
            <Button type="button" :disabled="!canSave" @click="saveMaterial">
              {{ isSavingLessonMaterial ? '저장 중' : '교안 저장' }}
            </Button>
          </div>
        </footer>
      </div>
    </DialogContent>
  </Dialog>

  <ConfirmDialog
    :open="Boolean(wordPendingDeletion)"
    title="예상 단어를 삭제할까요?"
    :message="`‘${wordPendingDeletion?.wordName ?? ''}’을(를) ${attemptLabel}에서 삭제합니다.`"
    confirm-label="단어 삭제"
    @cancel="wordPendingDeletion = null"
    @confirm="confirmDeleteWord"
  />
  <ConfirmDialog
    :open="materialPendingDeletion !== null"
    title="학습 자료를 삭제할까요?"
    :message="`자료 ${(materialPendingDeletion ?? 0) + 1}을 교안에서 삭제합니다.`"
    confirm-label="자료 삭제"
    @cancel="materialPendingDeletion = null"
    @confirm="confirmDeleteMaterial"
  />
  <ConfirmDialog
    :open="closePending"
    title="수정 내용을 취소할까요?"
    message="저장하지 않은 교안 수정 내용이 사라집니다."
    confirm-label="수정 취소"
    @cancel="closePending = false"
    @confirm="confirmClose"
  />
</template>

<style scoped>
.material-dialog {
  width: min(1180px, calc(100vw - 32px));
  height: min(820px, calc(100dvh - 32px));
  max-width: 1180px;
  max-height: calc(100dvh - 32px);
}
.material-editor {
  display: grid;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--white);
  box-shadow: 0 24px 70px rgb(15 23 42 / 22%);
  grid-template-rows: auto minmax(0, 1fr) auto;
}
.editor-header,
.editor-footer,
.section-header,
.material-toolbar,
.order-actions,
.editor-header__actions {
  display: flex;
  align-items: center;
}
.editor-header,
.editor-footer {
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
}
.editor-header {
  border-bottom: 1px solid var(--border);
}
.editor-footer {
  border-top: 1px solid var(--border);
  background: var(--white);
}
.editor-footer > div:last-child,
.editor-header__actions,
.order-actions {
  display: flex;
  gap: 8px;
}
.editor-header span,
.section-header p {
  margin: 0 0 3px;
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
}
.editor-header h2,
.section-header h3 {
  margin: 0;
  color: var(--slate-900);
}
.editor-header h2 {
  font-size: 19px;
}
.section-header {
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.section-header h3 {
  font-size: 16px;
}
.editor-workspace {
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(480px, 1.15fr) minmax(360px, 0.85fr);
}
.edit-panel,
.preview-panel {
  min-width: 0;
  overflow-y: auto;
  padding: 20px;
}
.edit-panel {
  border-right: 1px solid var(--border);
}
.material-toolbar {
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}
.material-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.material-tabs button {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--white);
  color: var(--slate-600);
  font-size: 12px;
  font-weight: 700;
}
.material-tabs button.active {
  border-color: var(--primary-500);
  background: var(--primary-50);
  color: var(--primary-800);
}
.material-form {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}
.policy-row {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);
}
.policy-row > div {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-radius: 8px;
  background: var(--slate-50);
}
.policy-row small,
.policy-row strong {
  overflow-wrap: anywhere;
}
.policy-row small {
  color: var(--slate-500);
  font-size: 10px;
}
.policy-row strong {
  color: var(--slate-800);
  font-size: 11px;
}
fieldset {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
legend {
  padding: 0 7px;
  color: var(--slate-800);
  font-size: 12px;
  font-weight: 800;
}
fieldset label,
.dynamic-field > label,
.word-form > label {
  display: grid;
  gap: 6px;
  color: var(--slate-700);
  font-size: 11px;
  font-weight: 700;
}
.wide-field,
.empty-fields {
  grid-column: 1 / -1;
}
textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--white);
  padding: 9px 10px;
  color: var(--slate-900);
  font: inherit;
  font-size: 12px;
  line-height: 1.5;
}
textarea:focus {
  border-color: var(--primary-500);
  outline: 2px solid color-mix(in oklch, var(--primary-500) 18%, transparent);
}
.dynamic-field {
  display: grid;
  gap: 6px;
}
.array-field {
  display: grid;
  gap: 7px;
}
.array-field > div {
  display: grid;
  gap: 6px;
  grid-template-columns: minmax(0, 1fr) auto;
}
.readonly-value {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-radius: 7px;
  background: var(--slate-100);
  color: var(--slate-700);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.readonly-value small,
.empty-fields {
  color: var(--slate-500);
  font-size: 10px;
}
.word-settings {
  margin-top: 18px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
}
.word-settings summary {
  cursor: pointer;
  color: var(--slate-800);
  font-size: 12px;
  font-weight: 800;
}
.word-form {
  margin-top: 14px;
}
.word-form > div {
  display: grid;
  gap: 8px;
  margin-top: 6px;
  grid-template-columns: minmax(0, 1fr) auto;
}
.word-form > small {
  display: block;
  margin-top: 5px;
  color: var(--slate-400);
  font-size: 10px;
  text-align: right;
}
.word-form > small.error,
.inline-error {
  color: var(--danger-600);
}
.word-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.word-list li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 5px 4px 10px;
  border-radius: 999px;
  background: var(--primary-50);
  color: var(--primary-800);
  font-size: 11px;
  font-weight: 700;
}
.word-help,
.editor-footer p {
  margin: 8px 0 0;
  color: var(--slate-500);
  font-size: 11px;
}
.editor-footer p {
  margin: 0;
}
.section-state,
.section-error {
  margin: 16px 0 0;
  padding: 18px;
  border: 1px dashed var(--slate-300);
  border-radius: 9px;
  color: var(--slate-500);
  font-size: 12px;
  text-align: center;
}
.section-error {
  color: var(--danger-600);
}
.section-error p {
  margin: 0 0 10px;
}
.generation-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid #fde68a;
  border-radius: 9px;
  background: #fffbeb;
}
.generation-notice > div {
  display: grid;
  gap: 3px;
}
.generation-notice strong {
  font-size: 11px;
}
.generation-notice span {
  color: var(--slate-600);
  font-size: 10px;
}
.generation-notice.error {
  border-color: #fecaca;
  background: #fef2f2;
}
.preview-device {
  min-height: 480px;
  margin-top: 18px;
  overflow: hidden;
  border: 7px solid var(--slate-800);
  border-radius: 22px;
  background: var(--slate-50);
}
.preview-device__top {
  display: flex;
  justify-content: space-between;
  padding: 9px 12px;
  background: var(--slate-800);
  color: var(--white);
  font-size: 10px;
}
.preview-content {
  padding: 28px 22px;
}
.preview-content > small {
  color: var(--primary-700);
  font-weight: 800;
}
.preview-content h4 {
  margin: 6px 0 0;
  color: var(--slate-900);
  font-size: 21px;
}
.preview-content > p {
  margin: 8px 0 18px;
  color: var(--slate-600);
  font-size: 12px;
}
.preview-card,
.answer-preview {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--white);
}
dl {
  display: grid;
  gap: 4px 10px;
  margin: 0;
  grid-template-columns: minmax(90px, auto) 1fr;
}
dt {
  color: var(--slate-500);
  font-size: 10px;
}
dd {
  margin: 0;
  color: var(--slate-900);
  font-size: 12px;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.preview-hint {
  margin: 14px 0 0 !important;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  color: var(--primary-700) !important;
  font-size: 11px !important;
}
.answer-preview {
  margin-top: 12px;
}
.answer-preview summary {
  cursor: pointer;
  color: var(--slate-600);
  font-size: 11px;
  font-weight: 700;
}
.answer-preview dl {
  margin-top: 12px;
}
.preview-empty {
  display: grid;
  min-height: 420px;
  place-items: center;
  color: var(--slate-500);
  font-size: 12px;
}
.save-success {
  color: var(--success-700, #15803d) !important;
  font-weight: 700;
}
@media (max-width: 900px) {
  .editor-workspace {
    overflow-y: auto;
    grid-template-columns: 1fr;
  }
  .edit-panel,
  .preview-panel {
    overflow: visible;
  }
  .edit-panel {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}
@media (max-width: 600px) {
  .material-dialog {
    width: calc(100vw - 12px);
    height: calc(100dvh - 12px);
    max-height: calc(100dvh - 12px);
  }
  .editor-header,
  .editor-footer,
  .edit-panel,
  .preview-panel {
    padding: 14px;
  }
  .material-toolbar,
  .editor-footer {
    align-items: stretch;
    flex-direction: column;
  }
  .policy-row,
  fieldset {
    grid-template-columns: 1fr;
  }
  .wide-field {
    grid-column: auto;
  }
}
</style>
