<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getLessonMaterialEditorDefinition,
  type EditableLessonMaterialItem,
  type LessonMaterialFieldError,
  type LessonMaterialEditorCode,
  type LessonMaterialFieldDefinition,
  type LessonMaterialValidationIssue,
} from '@/features/teacher/training'
import ImageWordCandidatePicker from './ImageWordCandidatePicker.vue'

const props = withDefaults(
  defineProps<{
    material: EditableLessonMaterialItem
    editorCode: LessonMaterialEditorCode
    disabled: boolean
    fieldErrors: readonly LessonMaterialFieldError[]
    validationIssues?: readonly LessonMaterialValidationIssue[]
  }>(),
  { validationIssues: () => [] },
)

const emit = defineEmits<{
  updateField: [section: 'content' | 'answer', key: string, value: unknown]
  editorError: [message: string | null]
}>()

const definition = computed(() => getLessonMaterialEditorDefinition(props.material.questionType))
const jsonTexts = ref<Record<string, string>>({})
const jsonErrors = ref<Record<string, string>>({})

watch(
  () => props.material,
  () => {
    jsonTexts.value = {}
    jsonErrors.value = {}
    emit('editorError', null)
  },
)

function fieldId(section: 'content' | 'answer', key: string): string {
  return `material-${props.material.questionNo}-${section}-${key}`
}

function valueFor(section: 'content' | 'answer', key: string): unknown {
  return props.material[section][key]
}

function fieldsFor(section: 'content' | 'answer'): readonly LessonMaterialFieldDefinition[] {
  const fields = definition.value?.[section === 'content' ? 'contentFields' : 'answerFields'] ?? []
  return fields.filter((field) => field.key !== 'traceAssetKey')
}

function errorsFor(
  section: 'content' | 'answer',
  key: string,
): readonly LessonMaterialFieldError[] {
  const path = `.${section}.${key}`
  return props.fieldErrors.filter(
    (error) =>
      error.path.endsWith(path) ||
      error.path.includes(`${path}.`) ||
      error.path.includes(`${path}[`),
  )
}

function validationIssuesFor(
  section: 'content' | 'answer',
  key: string,
): readonly LessonMaterialValidationIssue[] {
  const path = `${section}.${key}`
  return props.validationIssues.filter(
    (issue) =>
      issue.path === path || issue.path.startsWith(`${path}.`) || issue.path.startsWith(`${path}[`),
  )
}

function update(
  section: 'content' | 'answer',
  field: LessonMaterialFieldDefinition,
  value: unknown,
): void {
  if (props.disabled || field.readonly) return
  emit('updateField', section, field.key, value)
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function numberValue(value: unknown, field: LessonMaterialFieldDefinition): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  return String(field.key.endsWith('Index') ? value + 1 : value)
}

function updateNumber(
  section: 'content' | 'answer',
  field: LessonMaterialFieldDefinition,
  value: string | number,
): void {
  const displayed = Number(value)
  const normalized = field.key.endsWith('Index') ? displayed - 1 : displayed
  const bounded = Number.isFinite(normalized) ? Math.max(0, normalized) : 0
  update(section, field, field.max === undefined ? bounded : Math.min(field.max, bounded))
}

function listValue(value: unknown): unknown[] {
  return Array.isArray(value) ? [...value] : []
}

function itemText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return typeof value.text === 'string' ? value.text : ''
  }
  return ''
}

function itemImageUrl(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('imageUrl' in value)) return null
  return typeof value.imageUrl === 'string' && value.imageUrl ? value.imageUrl : null
}

function isImageCandidate(value: unknown): boolean {
  return typeof value === 'object' && value !== null && ('imageId' in value || 'imageUrl' in value)
}

function isImageWordField(field: LessonMaterialFieldDefinition): boolean {
  return (
    props.material.questionType === 'SAME_INITIAL_WORD_CHOICE' &&
    props.material.content.choiceType === 'IMAGE_WORD' &&
    field.key === 'choices'
  )
}

function updateListItem(
  section: 'content' | 'answer',
  field: LessonMaterialFieldDefinition,
  index: number,
  value: string,
): void {
  const items = listValue(valueFor(section, field.key))
  const current = items[index]
  items[index] =
    typeof current === 'object' && current !== null ? { ...current, text: value } : value
  update(section, field, items)
}

function addListItem(section: 'content' | 'answer', field: LessonMaterialFieldDefinition): void {
  const items = listValue(valueFor(section, field.key))
  if (field.maxItems !== undefined && items.length >= field.maxItems) return
  update(section, field, [...items, ''])
}

function deleteListItem(
  section: 'content' | 'answer',
  field: LessonMaterialFieldDefinition,
  index: number,
): void {
  const items = listValue(valueFor(section, field.key))
  update(
    section,
    field,
    items.filter((_, candidateIndex) => candidateIndex !== index),
  )
}

function jsonKey(section: 'content' | 'answer', key: string): string {
  return `${section}.${key}`
}

function jsonValue(section: 'content' | 'answer', key: string): string {
  const id = jsonKey(section, key)
  return jsonTexts.value[id] ?? JSON.stringify(valueFor(section, key), null, 2)
}

function updateJson(
  section: 'content' | 'answer',
  field: LessonMaterialFieldDefinition,
  event: Event,
): void {
  const value = (event.target as HTMLTextAreaElement).value
  const id = jsonKey(section, field.key)
  jsonTexts.value = { ...jsonTexts.value, [id]: value }
  if (value.length > 20_000) {
    const next = { ...jsonErrors.value, [id]: 'JSON 입력은 20,000자 이내로 입력해 주세요.' }
    jsonErrors.value = next
    emit('editorError', Object.values(next)[0] ?? null)
    return
  }
  try {
    const parsed = JSON.parse(value)
    const remaining = { ...jsonErrors.value }
    delete remaining[id]
    jsonErrors.value = remaining
    emit('editorError', Object.values(remaining)[0] ?? null)
    update(section, field, parsed)
  } catch {
    const next = { ...jsonErrors.value, [id]: '올바른 JSON 배열 형식으로 입력해 주세요.' }
    jsonErrors.value = next
    emit('editorError', Object.values(next)[0] ?? null)
  }
}
</script>

<template>
  <div v-if="definition && definition.editorCode === editorCode" class="behavior-editor">
    <header class="behavior-editor__header">
      <div>
        <small>{{ definition.editorCode }}</small>
        <strong>{{ definition.editorLabel }}</strong>
      </div>
      <p>{{ definition.childAction }}</p>
    </header>

    <fieldset v-for="section in ['content', 'answer'] as const" :key="section" :disabled="disabled">
      <legend>{{ section === 'content' ? '문항 내용' : '정답·평가 기준' }}</legend>
      <div
        v-for="field in fieldsFor(section)"
        :key="`${section}-${field.key}`"
        class="behavior-field"
        :class="{ 'behavior-field--wide': field.kind !== 'number' && field.kind !== 'select' }"
      >
        <label :for="fieldId(section, field.key)">{{ field.label }}</label>

        <div v-if="field.readonly" :id="fieldId(section, field.key)" class="readonly-field">
          <span>{{
            (field.format
              ? field.format(valueFor(section, field.key))
              : textValue(valueFor(section, field.key))) || '서버 값 없음'
          }}</span>
          <small>{{
            field.help ?? 'Backend 또는 미디어 정책이 관리하는 읽기 전용 값입니다.'
          }}</small>
        </div>

        <textarea
          v-else-if="field.kind === 'textarea'"
          :id="fieldId(section, field.key)"
          :value="textValue(valueFor(section, field.key))"
          :aria-invalid="
            errorsFor(section, field.key).length > 0 ||
            validationIssuesFor(section, field.key).length > 0
          "
          :maxlength="field.maxLength"
          rows="3"
          @input="update(section, field, ($event.target as HTMLTextAreaElement).value)"
        />

        <Input
          v-else-if="field.kind === 'text'"
          :id="fieldId(section, field.key)"
          :model-value="textValue(valueFor(section, field.key))"
          :aria-invalid="
            errorsFor(section, field.key).length > 0 ||
            validationIssuesFor(section, field.key).length > 0
          "
          :maxlength="field.maxLength"
          @update:model-value="update(section, field, String($event))"
        />

        <Input
          v-else-if="field.kind === 'number'"
          :id="fieldId(section, field.key)"
          type="number"
          min="1"
          :max="field.max"
          :model-value="numberValue(valueFor(section, field.key), field)"
          :aria-invalid="
            errorsFor(section, field.key).length > 0 ||
            validationIssuesFor(section, field.key).length > 0
          "
          @update:model-value="updateNumber(section, field, $event)"
        />

        <select
          v-else-if="field.kind === 'select'"
          :id="fieldId(section, field.key)"
          :value="textValue(valueFor(section, field.key))"
          :aria-invalid="
            errorsFor(section, field.key).length > 0 ||
            validationIssuesFor(section, field.key).length > 0
          "
          @change="update(section, field, ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="option in field.options"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled"
          >
            {{ option.label }}
          </option>
        </select>

        <ImageWordCandidatePicker
          v-else-if="isImageWordField(field)"
          :choices="listValue(valueFor(section, field.key))"
        />

        <div
          v-else-if="field.kind === 'string-list' || field.kind === 'choice-list'"
          class="list-editor"
        >
          <div
            v-for="(item, index) in listValue(valueFor(section, field.key))"
            :key="index"
            class="list-editor__item"
          >
            <img
              v-if="itemImageUrl(item)"
              :src="itemImageUrl(item) ?? undefined"
              :alt="`${field.label} ${index + 1}`"
            />
            <Input
              :id="index === 0 ? fieldId(section, field.key) : undefined"
              :model-value="itemText(item)"
              :aria-label="`${field.label} ${index + 1}`"
              :disabled="isImageCandidate(item)"
              :maxlength="field.maxLength"
              @update:model-value="updateListItem(section, field, index, String($event))"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              :aria-label="`${field.label} ${index + 1} 삭제`"
              @click="deleteListItem(section, field, index)"
            >
              ×
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            type="button"
            :disabled="
              field.maxItems !== undefined &&
              listValue(valueFor(section, field.key)).length >= field.maxItems
            "
            @click="addListItem(section, field)"
          >
            + 항목 추가
          </Button>
        </div>

        <div v-else class="json-editor">
          <textarea
            :id="fieldId(section, field.key)"
            :value="jsonValue(section, field.key)"
            rows="6"
            :aria-invalid="Boolean(jsonErrors[jsonKey(section, field.key)])"
            @input="updateJson(section, field, $event)"
          />
          <small v-if="jsonErrors[jsonKey(section, field.key)]" class="field-error" role="alert">
            {{ jsonErrors[jsonKey(section, field.key)] }}
          </small>
        </div>

        <small v-if="field.help && !field.readonly" class="field-help">{{ field.help }}</small>
        <small
          v-for="issue in validationIssuesFor(section, field.key)"
          :key="`${issue.path}-${issue.message}`"
          class="field-error"
          role="alert"
        >
          {{ issue.message }}
        </small>
        <small
          v-for="error in errorsFor(section, field.key)"
          :key="`${error.path}-${error.reason}`"
          class="field-error"
          role="alert"
        >
          {{ error.message }}
        </small>
      </div>
    </fieldset>
  </div>
  <p v-else class="unsupported-editor" role="alert">
    이 문항 유형에 맞는 {{ editorCode }} 편집기를 찾을 수 없습니다.
  </p>
</template>

<style scoped>
.behavior-editor {
  display: grid;
  gap: 1rem;
}

.behavior-editor__header {
  display: grid;
  gap: 0.35rem;
  border-radius: 0.85rem;
  background: #eff6ff;
  padding: 0.9rem 1rem;
}

.behavior-editor__header div {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.behavior-editor__header small {
  border-radius: 999px;
  background: #2563eb;
  color: white;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
}

.behavior-editor__header strong {
  color: #172554;
}

.behavior-editor__header p,
.field-help,
.readonly-field small {
  margin: 0;
  color: #64748b;
  font-size: 0.78rem;
}

fieldset {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
  border: 1px solid #dbe3ef;
  border-radius: 0.85rem;
  padding: 1rem;
}

legend {
  padding: 0 0.35rem;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 800;
}

.behavior-field {
  display: grid;
  align-content: start;
  gap: 0.4rem;
}

.behavior-field--wide {
  grid-column: 1 / -1;
}

.behavior-field > label {
  color: #334155;
  font-size: 0.78rem;
  font-weight: 700;
}

textarea,
select {
  width: 100%;
  border: 1px solid #d7dee8;
  border-radius: 0.65rem;
  background: white;
  padding: 0.7rem 0.75rem;
  color: #0f172a;
}

textarea:focus,
select:focus {
  border-color: #3b82f6;
  outline: 2px solid #bfdbfe;
}

.readonly-field {
  display: grid;
  gap: 0.25rem;
  border: 1px dashed #cbd5e1;
  border-radius: 0.65rem;
  background: #f8fafc;
  padding: 0.7rem 0.75rem;
  overflow-wrap: anywhere;
}

.list-editor {
  display: grid;
  gap: 0.5rem;
}

.list-editor__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.45rem;
}

.list-editor__item img {
  width: 3rem;
  height: 3rem;
  border-radius: 0.55rem;
  object-fit: cover;
}

.json-editor {
  display: grid;
  gap: 0.3rem;
}

.field-error,
.unsupported-editor {
  margin: 0;
  color: #dc2626;
  font-size: 0.78rem;
}

@media (max-width: 760px) {
  fieldset {
    grid-template-columns: 1fr;
  }

  .behavior-field--wide {
    grid-column: auto;
  }
}
</style>
